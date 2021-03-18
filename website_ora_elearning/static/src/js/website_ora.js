odoo.define('website_ora_elearning.website_ora', function (require) {
'use strict';

var publicWidget = require('web.public.widget');
var wysiwygLoader = require('web_editor.loader');
var weDefaultOptions = require('web_editor.wysiwyg.default_options');


publicWidget.registry.websiteORA = publicWidget.Widget.extend({
    selector: '.o_user_response',
    read_events: {
        'click .o_wprofile_submit_btn': '_onSubmitClick',
    },
    /**
     * @override
     */
    start: function () {
        var self = this;
        _.each($('textarea.o_wysiwyg_loader'), function (textarea) {
            var $textarea = $(textarea);
            var toolbar = [
                ['style', ['style']],
                ['font', ['bold', 'italic', 'underline', 'clear']],
                ['para', ['ul', 'ol', 'paragraph']],
                ['table', ['table']],
                ['insert', ['link', 'picture']]
            ];
            var options = {
                height: 150,
                width: 825,
                minHeight: 80,
                toolbar: toolbar,
                styleWithSpan: false,
                styleTags: _.without(weDefaultOptions.styleTags, 'h1', 'h2', 'h3'),
                disableResizeImage: true,
            };
            wysiwygLoader.load(self, $textarea[0], options).then(wysiwyg => {
                self._wysiwyg = wysiwyg;
            });
        });
        _.each(this.$('.o_wforum_bio_popover'), authorBox => {
            $(authorBox).popover({
                trigger: 'hover',
                offset: 10,
                animation: false,
                html: true,
            });
        });
    },
    
    /**
     * @private
     */
    _onSubmitClick: function () {
        if (this._wysiwyg) {
            this._wysiwyg.save();
        }
    },
});

return publicWidget.registry.websiteORA;

});
