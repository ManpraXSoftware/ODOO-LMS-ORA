odoo.define('web_elearning_video.summernote', function (require) {
    'use strict';
    var core = require('web.core');
    var wysiwyg = require('web_editor.wysiwyg');
    var handler = $.summernote.eventHandler;
    var lang = $.summernote.lang.odoo;
    var _t = core._t;
    var tmpl = $.summernote.renderer.getTemplate();
    $.extend(lang, {
        video: {
            video: _t('Add Video'),
        },
        audio: {
            audio: _t('Add Audio')
        }
    })
    $.summernote.addPlugin({
        buttons: {
            "video": function (lang, options) {
                var button = tmpl.iconButton(options.iconPrefix + 'video-camera', {
                    event: 'showVideoDialog',
                    hide: true,
                    title: lang.video.video,
                });
                return button;
            }
        },
        events: {
            "showVideoDialog": function (layoutInfo, value) {
                var dom = $.summernote.core.dom;
                var layoutInfoCustom = dom.makeLayoutInfo(layoutInfo.target);
                var $dialog = layoutInfoCustom.dialog(),
                    $editable = layoutInfoCustom.editable();
                handler.invoke('editor.saveRange', $editable);
                this.videoDialog($editable, $dialog).then(function (data) {
                    handler.invoke('editor.restoreRange', $editable);
                    // if (typeof data === 'string') {
                    // // image url
                    // handler.invoke('editor.insertImage', $editable, data);
                    // } else {
                    // // array of files
                    // handler.insertImages(layoutInfoCustom, data);
                    // }
                }).fail(function () {
                    handler.invoke('editor.restoreRange', $editable);
                });
            },
            "videoDialog": function ($editable, $dialog) {
                return $.Deferred(function (deferred) {
                    var mediaSource = new MediaSource();
                    mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
                    var $videoDialog = $dialog.find('.note-video-dialog');
                    var $videoInput = $dialog.find('.note-video-input');
                    var mediaRecorder;
                    var recordedBlobs;
                    var sourceBuffer;
                    var gumVideo = $dialog.find('.note-video-input');
                    var recordedVideo = $dialog.find('.note-video-input');
                    var recordButton = $dialog.find('.note-video-btn');
                    var playButton = $dialog.find('.note-video-play');
                    var downloadButton = $dialog.find('.note-video-download');
                    var $videoBtn = $dialog.find('.note-video-btn');
                    var constraints = {
                        audio: true,
                        video: true
                    };
                    navigator.mediaDevices.getUserMedia(
                        constraints
                      ).then(
                        successCallback,
                        errorCallback
                      );
                    $videoDialog.one('shown.bs.modal', function () {
                        $videoBtn.click(function (event) {
                            event.preventDefault();
                            toggleRecording();
                          });
                    }).one('hidden.bs.modal', function () {
                        $videoBtn.off('click');
                        if (deferred.state() === 'pending') {
                          deferred.reject();
                        }
                    }).modal('show');
                    function successCallback(stream) {
                        console.log('getUserMedia() got stream: ', stream);
                        window.stream = stream;
                        gumVideo.srcObject = stream;
                      }
                      
                      function errorCallback(error) {
                        console.log('navigator.getUserMedia error: ', error);
                      }
                      
                      function handleSourceOpen(event) {
                        console.log('MediaSource opened');
                        sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
                        console.log('Source buffer: ', sourceBuffer);
                      }
                      
                      function handleDataAvailable(event) {
                        if (event.data && event.data.size > 0) {
                          recordedBlobs.push(event.data);
                        }
                      }
                      
                      function handleStop(event) {
                        console.log('Recorder stopped: ', event);
                        console.log('Recorded Blobs: ', recordedBlobs);
                      }
                      
                      function toggleRecording() {
                        if (recordButton.textContent === 'Start Recording') {
                          startRecording();
                        } else {
                          stopRecording();
                          recordButton.textContent = 'Start Recording';
                          playButton.disabled = false;
                          downloadButton.disabled = false;
                        }
                      }
                      
                      // The nested try blocks will be simplified when Chrome 47 moves to Stable
                      function startRecording() {
                        var options = {mimeType: 'video/webm;codecs=vp9', bitsPerSecond: 100000};
                        recordedBlobs = [];
                        try {
                          mediaRecorder = new MediaRecorder(window.stream, options);
                        } catch (e0) {
                          console.log('Unable to create MediaRecorder with options Object: ', options, e0);
                          try {
                            options = {mimeType: 'video/webm;codecs=vp8', bitsPerSecond: 100000};
                            mediaRecorder = new MediaRecorder(window.stream, options);
                          } catch (e1) {
                            console.log('Unable to create MediaRecorder with options Object: ', options, e1);
                            try {
                              options = 'video/mp4';
                              mediaRecorder = new MediaRecorder(window.stream, options);
                            } catch (e2) {
                              alert('MediaRecorder is not supported by this browser.');
                              console.error('Exception while creating MediaRecorder:', e2);
                              return;
                            }
                          }
                        }
                        console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
                        recordButton.textContent = 'Stop Recording';
                        playButton.disabled = true;
                        downloadButton.disabled = true;
                        mediaRecorder.onstop = handleStop;
                        mediaRecorder.ondataavailable = handleDataAvailable;
                        mediaRecorder.start(10); // collect 10ms of data
                        console.log('MediaRecorder started', mediaRecorder);
                      }
                      
                      function stopRecording() {
                        mediaRecorder.stop();
                        recordedVideo.controls = true;
                      }
                      
                      function play() {
                        var type = (recordedBlobs[0] || {}).type;
                        var superBuffer = new Blob(recordedBlobs, {type});
                        recordedVideo.src = window.URL.createObjectURL(superBuffer);
                      }
                      
                      function download() {
                        var blob = new Blob(recordedBlobs, {type: 'video/webm'});
                        var url = window.URL.createObjectURL(blob);
                        var a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = 'test.webm';
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(function() {
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        }, 100);
                      }
                });
            }
        },
        dialogs: {
            videoDialog: function (lang, options) {
                var body =
                `<div id="container">
                    <video id="gum" autoplay muted playsinline></video>
                    <video id="recorded" class="note-video-input" autoplay loop playsinline></video>
                    <div>
                        <button id="record" class="note-video-btn">Start Recording</button>
                        <button id="play" class="note-video-play" disabled>Play</button>
                        <button id="download" class="note-video-download" disabled>Download</button>
                    </div>
                </div>
                `;
                var footer = '<button href="#" class="btn btn-primary note-link-btn disabled" disabled>' + 'Add Video' + '</button>';
                return tmpl.dialog('note-video-dialog', 'Add Video', body, footer);
            }
        }
    });
});

