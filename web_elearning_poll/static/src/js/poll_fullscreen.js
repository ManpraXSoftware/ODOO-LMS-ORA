odoo.define('web_elearning_poll.poll_fullscreen', function (require) {
'"use strict"';

var core = require('web.core');
var QWeb = core.qweb;
var Fullscreen = require('website_slides.fullscreen');
var Sidebar = require('website_slides.fullscreen');



/**
 * Helper: Get the slide dict matching the given criteria
 *
 * @private
 * @param {Array<Object>} slideList List of dict reprensenting a slide
 * @param {Object} matcher (see https://underscorejs.org/#matcher)
 */

var findSlide = function (slideList, matcher) {
    var slideMatch = _.matcher(matcher);
    return _.find(slideList, slideMatch);
};

Fullscreen.include({
    xmlDependencies: (Fullscreen.prototype.xmlDependencies || []).concat(
        ["/web_elearning_poll/static/src/xml/fullscreen_poll.xml"]
    ),
    events: {
        "click .o_wslides_js_lesson_poll_submit": '_submitPoll',
        "click .o_wslides_fs_toggle_sidebar": '_onClickToggleSidebar',
    },
    
    _preprocessSlideData: function (slidesDataList) {
        var res = this._super.apply(this, arguments);
        res.forEach(function (slideData, index) {
            slideData.isPoll = !!slideData.isPoll;
            slideData.hasQuestion = !!slideData.hasQuestion;
            slideData._autoSetDone = _.contains(['infographic', 'presentation', 'document', 'webpage'], slideData.type) && !slideData.isPoll && !slideData.hasQuestion;
        });
        return res;
    },
    _onChangeSlideRequest: function (ev){
        var slideData = ev.data;
        var result = this._super.apply(this, arguments);
        var newSlide = findSlide(this.slides, {
            id: slideData.id,
            isQuiz: slideData.isQuiz || false,
            isPoll: slideData.isPoll || false,
        });
        this.set('slide', newSlide);
        this.shareButton._onChangeSlide(newSlide);
    },
    _renderSlide: function (){
        var def = this._super.apply(this, arguments);
        var $content = this.$('.o_wslides_fs_content');
        this.$('.poll_tab.active').removeClass('active');
        var slide_poll = $('.poll_tab.active').data('isPoll');
        if (slide_poll === true){
             this._rpc({
                route: '/slides/slide/get_values',
                params: {
                    slide_id:(this.get('slide').id),
                }
            }).then(function (data){
                $content.html(QWeb.render('poll.assessment',{widget: data}));
                // $('.ora_tab.active').removeClass('active');
        
            });
        }
        return Promise.all([def]);
    },
    _submitPoll: function (ev) {
        var data = $('#poll_form').serializeArray();
        data.push({name: ev.currentTarget.name, value: ev.currentTarget.value});
        ev.preventDefault();
        var self = this;
        $.ajax({
            type: "POST",
            url: "/poll/response/save/",
            data: data,
            success: function (data) {
                self._renderSlide();
            }
        });
    },

  });


Sidebar.include({
     /**
     * Actively changes the active tab in the sidebar so that it corresponds
     * the slide currently displayed
     *
     * @private
     */
      _onChangeCurrentSlide: function () {
        var slide = this.get('slideEntry');
        this.$('.o_wslides_fs_sidebar_list_item.active').removeClass('active');
        var selector = '.o_wslides_fs_sidebar_list_item[data-id='+slide.id+'][data-is-quiz!="1"]';

        this.$(selector).addClass('active');
        this.$('.ora_tab.active').removeClass('active');
        this.trigger_up('change_slide', this.get('slideEntry'));
    },
})

});