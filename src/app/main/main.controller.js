'use strict';

/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var module = angular.module('editor');


module.controller('MainCtrl', ['$scope', '$http', '$location', '$routeParams', '$q', '$mdToast', 'drive', 'login', 'renameDialog',
    function($scope, $http, $location, $routeParams, $q, $mdToast, drive, login, renameDialog) {

        var DEFAULT_FILE = {
            content: '',
            metadata: {
                id: null,
                title: 'untitled.txt',
                mimeType: 'text/plain',
                editable: true
            }
        };

        $scope.file = null;
        $scope.loading = true;

        /**
         * Displays a short message as a toast
         *
         * @param {String} message Message to display
         */
        var showMessage = function(message) {
            $mdToast.show($mdToast.simple().content(message));
        };

        /**
         * Internal helper to saves the current file. If the file is new, redirects to the correct URL once complete.
         *
         * @return {Promise} promise that resolves once the save is complete
         */
        var save = function() {
            return drive.saveFile($scope.file.metadata, $scope.file.content).then(function(result) {
                redirectIfChanged(result.metadata.id);
                $scope.file = result;
                showMessage('File saved');
                return $scope.file;
            }, function(err) {
                showMessage('Unable to save file');
                return $q.reject(err);
            });
        };

        /**
         * Internal helper to load a file. If no ID given or unable to read the specified file, a blank template
         * is loaded.
         *
         * @param {String} fileId ID of the file to load
         * @return {Promise} promise that resolves once the file is loaded
         */
        var load = function(fileId) {
            var filePromise = fileId ? drive.loadFile(fileId) : $q.when(DEFAULT_FILE);
            return filePromise.then(function(file) {
                $scope.file = file;
                return $scope.file;
            }, function(err) {
                if (fileId) {
                    showMessage('Unable to load file');
                }
                return load();
            });
        };

        /**
         * Check to see if the URL should be changed (new doc ID), redirects
         * to the new URL if so.
         *
         * @param {String} id Document ID
         */
        var redirectIfChanged = function(id) {
            if ($scope.file.metadata.id != id) {
                $location.path('/edit/' + id);
                $location.search('');
                $location.replace();
            }
        };

        /**
         * Handles the save button click for user-initiated saves. If saving a new file,
         * first prompts to rename the file.
         *
         * @param {Event} $event Original click event
         */
        this.saveFile = function($event) {
            if ($scope.file.metadata.id === null) {
                return this.renameFile($event);
            } else {
                return save();
            }
        };

        /**
         * Handles the title/rename click. Saves the file immediately on rename.
         *
         * @param {Event} $event Original click event
         */
        this.renameFile = function($event) {
            return renameDialog.show($event, $scope.file.metadata.title).then(function(title) {
                $scope.file.metadata.title = title;
                return save();
            });
        };

        /**
         * Handle the open file click. Displays the Drive file picker and opens
         * the selected document.
         */
        this.openFile = function($event) {
            drive.showPicker().then(function(id) {
                redirectIfChanged(id);
            });
        };

        var sendToOildex = function() {
            //TODO implement file sending
            console.log('cookie ' + getCookie('oildex.session'));
            var blob = new Blob([ $scope.file.content ], { type : 'text/plain' });
            console.log('blob ' + blob);
            console.log('postFile ' + JSON.stringify($scope.file));
            postFile()

        };

        var postFile = function() {

          var token = getCookie('oildex.session');

            $http({
                method: 'POST',
                url: 'http://local-api.oildex.com:8850/job',
                headers: {
                     access_token: token,
                    'Content-Type': undefined
                },
                data: {
                    userName: 'x0187270nv1',
                    documentType: 'RunTicket',
                    fileName: 'rt_sample.txt'
                },
                transformRequest: function(data, headersGetter) {
                    var formData = new FormData();
                    formData.append('file', new Blob([ $scope.file.content ], { type : 'text/plain' }));
                    angular.forEach(data, function(value, key) {
                        formData.append(key, value);
                    });

                    var headers = headersGetter();
                    //delete headers['Content-Type'];

                    return formData;
                }
            })
                .success(function(data) {

                })
                .error(function(data, status) {

                });
        }


        var getCookie = function(cname) {
            var name = cname + "=";
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') {
                    c = c.substring(1);
                }
                if (c.indexOf(name) == 0) {
                    return c.substring(name.length, c.length);
                }
            }
            return "";
        }


        /**
         * Handle the share click. Displays the Drive sharing dialog.
         */
        this.sendFile = function($event) {
            if ($scope.file.metadata.id === null) {
                $scope.ctrl.renameFile($event).then(function() {
                    sendToOildex();
                });
            } else {
                sendToOildex();
            }
        };

        // Authenticate & load doc
        var loadFn = angular.bind($scope.ctrl, load, $routeParams.fileId);
        login.checkAuth($routeParams.user).then(loadFn, function() {
            return login.showLoginDialog(null, $routeParams.user).then(loadFn);
        }).finally(function() {
            $scope.loading = false;
        });

    }
]);