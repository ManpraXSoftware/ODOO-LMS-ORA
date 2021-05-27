odoo.define('web_elearning_video.summernote', function (require) {
    'use strict';
    var core = require('web.core');
    var publicWidget = require('web.public.widget');
    require('web_editor.wysiwyg');
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
            },
            "audio": function (lang, options) {
              var button = tmpl.iconButton(options.iconPrefix + 'volume-up', {
                  event: 'showAudioDialog',
                  hide: true,
                  title: lang.audio.video,
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
                var header = $dialog.find('.note-video-dialog').find('.modal-header');
                header.find('.close').attr('aria-hidden', false);
                handler.invoke('editor.saveRange', $editable);
                this.videoDialog($editable, $dialog).then(function (data) {
                    handler.invoke('editor.restoreRange', $editable);
                    let url = window.location.origin + '/web/content/' + data.id + '?autoplay=0';
                    let videoUrl = `
                      <div class="media_iframe_video iframe_custom">
                        <video controls="true" class="embed-responsive-item" contenteditable="false">
                          <source src="${url}" type="video/webm" />
                        </video>
                      </div><br/>`;
                    let textVal = $dialog.parent().parent().children(':first-child').val();
                    textVal = textVal + videoUrl
                    $dialog.parent().parent().children(':first-child').val(textVal);
                    $editable.append(videoUrl);
                }).fail(function () {
                  handler.invoke('editor.restoreRange', $editable);
                });
            },
            "videoDialog": function ($editable, $dialog) {
                return $.Deferred(function (deferred) {
                    var mediaSource = new MediaSource();
                    mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
                    var $videoDialog = $dialog.find('.note-video-dialog');
                    var mediaRecorder;
                    var recordedBlobs;
                    var gumVideo = $videoDialog.find('video.gum').get(0);
                    var recordedVideo = $videoDialog.find('video.note-video-input').get(0);
                    var recordButton = $videoDialog.find('button.note-record-btn').get(0);
                    var playButton = $videoDialog.find('button.note-video-play').get(0);
                    var downloadButton = $videoDialog.find('button.note-video-download').get(0);
                    var $recordButton = $dialog.find('.note-record-btn');
                    var $videoBtn =  $dialog.find('.note-video-btn');
                    playButton.onclick = play;
                    downloadButton.onclick = download;
                    var constraints = {
                        audio: true,
                        video: true
                    };
                    const blobToBase64 = blob => {
                      const reader = new FileReader();
                      reader.readAsDataURL(blob);
                      return new Promise(resolve => {
                        reader.onloadend = () => {
                          resolve(reader.result);
                        };
                      });
                    };
                    async function addAttachment(){
                      let videoAttachment;
                      if (recordedBlobs){
                        let type = (recordedBlobs[0] || {}).type;
                        let superBuffer = new Blob(recordedBlobs, {type});
                        const bs64Video = await blobToBase64(superBuffer)
                        let rpc = require('web.rpc');
                        videoAttachment = await rpc.query({
                          route: '/web_editor/attachment/add_data',
                          params: {
                              'name': 'recording.webm',
                              'data': bs64Video.split(',')[2],
                              'res_id': $.summernote.options.res_id,
                              'res_model': $.summernote.options.res_model,
                          },
                        })
                      }
                      return videoAttachment;
                    }
                    $videoBtn.unbind().click(async function (event) {
                      event.preventDefault();
                      const attachmentObj = await addAttachment();
                      await deferred.resolve(attachmentObj);
                      $videoDialog.modal('hide');
                      recordedVideo.removeAttribute('src');
                      recordedVideo.load();
                      playButton.disabled = true;
                      downloadButton.disabled = true;
                      $videoBtn.attr("disabled", "disabled");
                      if (typeof(stream) == "object") {
                        stream.getTracks().forEach( (track) => {
                          track.stop();
                        });
                      }
                    });

                    navigator.mediaDevices.getUserMedia(
                        constraints
                      ).then(
                        successCallback,
                        errorCallback
                      );
                    $videoDialog.one('shown.bs.modal', function () {
                        $recordButton.click(function (event) {
                            event.preventDefault();
                            toggleRecording();
                          });
                    }).one('hidden.bs.modal', function () {
                        $recordButton.off('click');
                        if (deferred.state() === 'pending') {
                          deferred.reject();
                          if (mediaRecorder != undefined && mediaRecorder.state == 'recording') {
                            mediaRecorder.stop();
                            recordButton.textContent = 'Start Recording';
                          }
                          playButton.disabled = true;
                          downloadButton.disabled = true;
                          recordedVideo.removeAttribute('src');
                          recordedVideo.load();
                          if (typeof(stream) == "object") {
                            stream.getTracks().forEach( (track) => {
                              track.stop();
                            });
                          }
                        }
                    }).modal('show');
                    function successCallback(stream) {
                        window.stream = stream;
                        gumVideo.srcObject = stream;
                    }
                    
                    function errorCallback(error) {
                    }
                    
                    function handleSourceOpen(event) {
                      sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
                    }
                    
                    function handleDataAvailable(event) {
                      if (event.data && event.data.size > 0) {
                        recordedBlobs.push(event.data);
                      }
                    }
                      
                    function handleStop(event) {
                    }
                      
                    function toggleRecording() {
                      if (recordButton.textContent === 'Start Recording') {
                          startRecording();
                      } else {
                          stopRecording();
                          recordButton.textContent = 'Start Recording';
                          playButton.disabled = false;
                          downloadButton.disabled = false;
                          $videoBtn.removeAttr("disabled");
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
                      recordButton.textContent = 'Stop Recording';
                      playButton.disabled = true;
                      downloadButton.disabled = true;
                      mediaRecorder.onstop = handleStop;
                      mediaRecorder.ondataavailable = handleDataAvailable;
                      mediaRecorder.start(10); // collect 10ms of data
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
                        a.download = 'recording.webm';
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(function() {
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        }, 100);
                    }
                });
            },
            "showAudioDialog": function(layoutInfo, value){
              var dom = $.summernote.core.dom;
                var layoutInfoCustom = dom.makeLayoutInfo(layoutInfo.target);
                var $dialog = layoutInfoCustom.dialog(),
                    $editable = layoutInfoCustom.editable();
                var header = $dialog.find('.note-audio-dialog').find('.modal-header');
                header.find('.close').attr('aria-hidden', false);
                handler.invoke('editor.saveRange', $editable);
                this.audioDialog($dialog).then(function (data) {
                    handler.invoke('editor.restoreRange', $editable);
                    let url = window.location.origin + '/web/content/' + data.id + '?autoplay=0&rel=0';
                    let audioUrl = `
                    <div class="media_iframe_video iframe_custom">
                      <audio controls="true" class="embed-responsive-item" contenteditable="false">
                        <source src="${url}" type="audio/webm" />
                      </audio>
                    </div><br/>`;
                    let textVal = $dialog.parent().parent().children(':first-child').val();
                    textVal = textVal + audioUrl
                    $dialog.parent().parent().children(':first-child').val(textVal);
                    $editable.append(audioUrl);
                }).fail(function () {
                  handler.invoke('editor.restoreRange', $editable);
                });
            },
            "audioDialog": function($dialog) {
              return $.Deferred(function (deferred) {
                var $audioDialog = $dialog.find('.note-audio-dialog');
                var mediaRecorder;
                var recordedBlobs;
                var recordedAudio = $audioDialog.find('audio.recorded').get(0);
                var recordButton = $audioDialog.find('button.note-record-audio-btn').get(0);
                var playButton = $audioDialog.find('button.note-audio-play').get(0);
                var downloadButton = $audioDialog.find('button.note-audio-download').get(0);
                var $recordButton = $audioDialog.find('button.note-record-audio-btn');
                var $audioBtn =  $dialog.find('.note-audio-btn');
                playButton.onclick = play;
                downloadButton.onclick = download;
                var constraints = {
                    audio: true,
                    video: false
                };
                navigator.mediaDevices.getUserMedia(constraints).then(
                  successCallback, errorCallback
                );
                function successCallback(stream) {
                  window.stream = stream;
                }
                function errorCallback(error) {
                }
                $audioBtn.unbind().click(async function (event) {
                  event.preventDefault();
                  const attachmentObj = await addAttachment();
                  await deferred.resolve(attachmentObj);
                  $audioDialog.modal('hide');
                  recordedAudio.removeAttribute('src');
                  recordedAudio.load();
                  playButton.disabled = true;
                  downloadButton.disabled = true;
                  $audioBtn.attr("disabled", "disabled");
                  if (typeof(stream) == "object") {
                    stream.getTracks().forEach( (track) => {
                      track.stop();
                    });
                  }
                });
                const blobToBase64 = blob => {
                  const reader = new FileReader();
                  reader.readAsDataURL(blob);
                  return new Promise(resolve => {
                    reader.onloadend = () => {
                      resolve(reader.result);
                    };
                  });
                };
                async function addAttachment(){
                  let audioAttachment;
                  if (recordedBlobs){
                    let type = (recordedBlobs[0] || {}).type;
                    let superBuffer = new Blob(recordedBlobs, {type});
                    const bs64Audio = await blobToBase64(superBuffer)
                    let rpc = require('web.rpc');
                    audioAttachment = await rpc.query({
                      route: '/web_editor/attachment/add_data',
                      params: {
                          'name': 'recording.webm',
                          'data': bs64Audio.split(',')[1],
                          'res_id': $.summernote.options.res_id,
                          'res_model': $.summernote.options.res_model,
                      },
                    })
                  }
                  return audioAttachment;
                }
                $audioDialog.one('shown.bs.modal', function () {
                  $recordButton.click(function (event) {
                      event.preventDefault();
                      toggleRecording();
                    });
                }).one('hidden.bs.modal', function () {
                  $recordButton.off('click');
                  if (deferred.state() === 'pending') {
                    deferred.reject();
                    if (mediaRecorder != undefined && mediaRecorder.state == 'recording') {
                      mediaRecorder.stop();
                      recordButton.textContent = 'Start Recording';
                    }
                    playButton.disabled = true;
                    downloadButton.disabled = true;
                    recordedAudio.removeAttribute('src');
                    recordedAudio.load();
                    if (typeof(stream) == "object") {
                      stream.getTracks().forEach( (track) => {
                        track.stop();
                      });
                    }
                  }
                }).modal('show');
                function toggleRecording() {
                  if (recordButton.textContent === 'Start Recording') {
                      startRecording();
                  } else {
                      stopRecording();
                      recordButton.textContent = 'Start Recording';
                      playButton.disabled = false;
                      downloadButton.disabled = false;
                      $audioBtn.removeAttr("disabled");
                  }
                }
                function handleDataAvailable(event) {
                  if (event.data && event.data.size > 0) {
                    recordedBlobs.push(event.data);
                  }
                }
                function startRecording() {
                  mediaRecorder = new MediaRecorder(window.stream);
                  recordedBlobs = [];
                  recordButton.textContent = 'Stop Recording';
                  playButton.disabled = true;
                  downloadButton.disabled = true;
                  mediaRecorder.ondataavailable = handleDataAvailable;
                  mediaRecorder.start(); // collect 10ms of data
                }
                
                function stopRecording() {
                  mediaRecorder.stop();
                }
                function play() {
                  var type = (recordedBlobs[0] || {}).type;
                  var superBuffer = new Blob(recordedBlobs, {type});
                  recordedAudio.src = window.URL.createObjectURL(superBuffer);
                }
                function download() {
                  var blob = new Blob(recordedBlobs, {type: 'audio/webm'});
                  var url = window.URL.createObjectURL(blob);
                  var a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = 'recording.webm';
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(function() {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                  }, 100);
              }
              });
            },
        },
        dialogs: {
            videoDialog: function (lang, options) {
                var body =
                `<div id="container">
                    <div class="videos" style="display:flex;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;">
                      <video class="gum" autoplay muted playsinline style="width:49%"></video>
                      <video class="note-video-input" autoplay playsinline style="width:49%;background: #222;"></video>
                    </div>
                    <div>
                        <button class="note-record-btn">Start Recording</button>
                        <button class="note-video-play" disabled>Play</button>
                        <button class="note-video-download" disabled>Download</button>
                    </div>
                </div>
                `;
                var footer = '<button href="#" class="btn btn-primary note-video-btn" disabled>' + 'Add Video' + '</button>';
                return tmpl.dialog('note-video-dialog', 'Add Video', body, footer);
            },
            audioDialog: function (lang, options) {
              var body =
              `<div id="container">
                  <div>
                    <audio class="recorded" autoplay playsinline class="note-audio-input" controls></audio>
                  </div>
                  <div style="margin-top: 20px;margin-left: 10px;">
                      <button class="note-record-audio-btn">Start Recording</button>
                      <button class="note-audio-play" disabled>Play</button>
                      <button class="note-audio-download" disabled>Download</button>
                  </div>
              </div>
              `;
              var footer = '<button href="#" class="btn btn-primary note-audio-btn" disabled>' + 'Add Audio' + '</button>';
              return tmpl.dialog('note-audio-dialog', 'Add Audio', body, footer);
          }
        }
    });
});

