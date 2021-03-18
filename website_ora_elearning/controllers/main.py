# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import http
from odoo.http import request, Response
from datetime import datetime
from odoo.addons.http_routing.models.ir_http import slug
from odoo.addons.website_slides.controllers.main import WebsiteSlides


class WebsiteSlidesORA(WebsiteSlides):

    @http.route('/ora/response/save/', type='http', auth="user", methods=['POST'], website=True)
    def save_response(self, **kwargs):
        user_response = self._get_access_data(kwargs)
        slide = request.env['slide.slide'].sudo().browse(int(kwargs.get('slide_id')))
        if kwargs.get('submit') == 'save':
            self.add_answers(kwargs, user_response)
        if kwargs.get('submit') == 'resubmit_fresh':
            self._get_access_data(kwargs, resubmit=True)
            user_response.state = 'inactive'
        if kwargs.get('submit') == 'resubmit_copy':
            resubmit_copy_response = self._get_access_data(kwargs, resubmit=True)
            self.add_answers(kwargs, resubmit_copy_response)
            user_response.state = 'inactive'
        if kwargs.get('submit') == 'submit':
            user_response.state = 'submitted'
            user_response.submitted_date = datetime.now()
            self.add_answers(kwargs, user_response)
            user_response.message_post(
                body='This response has been submitted!', message_type='notification',
                subtype_xmlid='mail.mt_comment', author_id=request.env.user.partner_id.id,
                partner_ids=[user_response.staff_id.partner_id.id])
        return request.redirect('/slides/slide/%s' % slug(slide)) 

    def _get_access_data(self, post, resubmit=False):
        user = request.env.user
        slide_id = request.env['slide.slide'].sudo().browse(int(post.get('slide_id')))
        if slide_id.response_ids and not resubmit:
            response = slide_id.response_ids.filtered(lambda x: x.state in ['active', 'submitted'] and x.user_id == user)
            if response:
                return response
        response = slide_id._create_answer(request.env.user.id)
        return response

    def add_answers(self, kwargs, response):
        if kwargs.get('response_id'):
            old_user_response = request.env['ora.response'].browse(int(kwargs.get('response_id')))
            for line in response.user_response_line:
                for oline in old_user_response.user_response_line:
                    if line.prompt_id == oline.prompt_id:
                        if line.response_type == 'text':
                            line.value_text_box = oline.value_text_box
                        elif line.response_type == 'rich_text':
                            line.value_richtext_box = oline.value_richtext_box
        else:
            for line in response.user_response_line:
                if line.response_type == 'text':
                    line.value_text_box = kwargs[str(line.prompt_id.id)]
                elif line.response_type == 'rich_text':
                    line.value_richtext_box = kwargs[str(line.prompt_id.id)]

    def _prepare_additional_channel_values(self, values, **kwargs):
        values = super(WebsiteSlidesORA, self)._prepare_additional_channel_values(values, **kwargs)
        slide = values.get('slide')
        submitted = False
        ora_karma = {}
        if slide and slide.prompt_ids:
            values.update({
                'slide_prompts': [{
                    'id': prompt.id,
                    'sequence': prompt.sequence,
                    'question': prompt.question_name,
                    'response_type': prompt.response_type,
                    'submitted': submitted,
                    'name': prompt.name,
                } for prompt in slide.prompt_ids.sorted(key=lambda x: x.id)]
            })
        if slide and slide.response_ids:
            total_responses = slide.response_ids.filtered(lambda l: l.user_id == request.env.user)
            submitted_response = total_responses.filtered(lambda l: l.state == 'submitted')
            active_response = total_responses.filtered(lambda l: l.state == 'active')
            inactive_response = total_responses.filtered(lambda l: l.state == 'inactive')
            assessed_response = total_responses.filtered(lambda l: l.state == 'assessed')
            values['submitted_response'] = submitted_response
            values['active_response'] = active_response
            values['inactive_response'] = inactive_response
            values['total_responses'] = total_responses
            values['assessed_response'] = assessed_response
            ora_karma.setdefault(slide.id, 0)
            if assessed_response:
                ora_karma[slide.id] = assessed_response.xp_points
            for response in total_responses:
                if response.feedback == '<p><br></p>':
                    response.feedback = False
        values['ora_karma'] = ora_karma
        return values
