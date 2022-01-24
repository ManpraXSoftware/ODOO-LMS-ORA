# -*- coding: utf-8 -*-
from odoo import http
from odoo.exceptions import ValidationError
from odoo.http import request, Response
from datetime import datetime
import math
from odoo import _
from odoo.addons.http_routing.models.ir_http import slug
from odoo.addons.website_slides.controllers.main import WebsiteSlides



class WebsiteSlidePoll(WebsiteSlides):

    def _prepare_additional_channel_values(self, values, **kwargs):
        values = super(WebsiteSlidePoll, self)._prepare_additional_channel_values(values, **kwargs)
        slide = values.get('slide')
        if slide and slide.poll_ids:
            values.update({
                'slide_polls': [{
                    'quest_id': poll.id,
                    'quest_text': poll.quest_text,
                    'quest': poll.quest,
                    'option_ids': [{
                        'option_value': option.option_value,
                        'option_text_value': option.option_text_value,
                        'option_id': option.id,
                        } for option in poll.option_ids],
                } for poll in slide.poll_ids.sorted(key=lambda x: x.id)]
            })
        if slide and slide.poll_response_ids.filtered(lambda x: x.user_id == request.env.user):
            result_dict = {}
            for response in slide.poll_response_ids:
                for question in response.user_response_line:
                    key = question.poll_id.id
                    result_dict.setdefault(key, {})
                    for option in question.response_option_ids:
                        option_key = option.option_id.id
                        result_dict[key].setdefault(option_key, 0)
                        if option.selected_option:
                            result_dict[key][option_key] += 1
            # print(result_dict)
            parent_dict={}
            index=0
            for i,j in result_dict.items():
                total_user=0
                for k1,v1 in j.items():
                    total_user +=v1
                for k,v in j.items():
                    value_per=v/total_user * 100
                    index+=1
                    parent_dict.update ({
                       k: math.trunc(round(value_per,0))
                    })
            values.update({'option_percentage': parent_dict})
        return values



    @http.route(['/poll/response/save'], type='http', auth="public", website=True)
    def poll_response_submit(self, **kwargs):
        slide = request.env['slide.slide'].sudo().browse(int(kwargs.get('slide_id')))
        if kwargs.get('submit') == 'submit':
            polls_dict = {k:v for k, v in kwargs.items() if 'poll_' in k }
            if polls_dict:
                polls_ids = request.env['poll.poll']
                for rec in polls_dict:
                    polls_ids += request.env['poll.poll'].browse(int(rec.split('poll_')[1]))
                response_data = {
                    'slide_id': kwargs.get('slide_id'),
                    'user_id':request.env.user.id,
                    'submitted_date': datetime.now(),
                    'user_response_line':[(0, 0, {
                        'poll_id': poll.id,
                        'response_option_ids': [(0, 0, {
                            'option_id': option.id,
                            'option_name': option.option_text_value if option.option_text_value else '',
                            'selected_option': True if str(option.id) == polls_dict['poll_'+ str(poll.id)] else False,
                            'option_richname': option.option_value if option.option_value != '<p><br></p>' else ''
                        }) for option in poll.option_ids]

                    })  for poll in polls_ids]
                }
                
                request.env['poll.response'].create(response_data)
            # else:
            #     response_data = {}
            #     response_data.update({
            #         'error': {},
            #         'error_message': ['Choose atleast one'],
            #         'return_url': return_url,
            #         'json': False,
            #         'bootstrap_formatting': True
            #     })

            return request.redirect('/slides/slide/%s' % slug(slide))



    @http.route('/slides/slide/get_values', website=True, type="json", auth="user")
    def slide_get_value(self, slide_id):
        csrf_token = request.csrf_token()
        slide = request.env['slide.slide'].browse(slide_id)
        values = {'slide':slide.id, 'csrf_token':csrf_token}
        if slide and slide.poll_ids:
            values.update({
                    'slide_polls': [{
                    'quest_id': poll.id,
                    'quest_text': poll.quest_text,
                    'quest': poll.quest,
                    'option_ids': [{
                        'option_value': option.option_value,
                        'option_text_value': option.option_text_value,
                        'option_id': option.id,
                        } for option in poll.option_ids],
                } for poll in slide.poll_ids.sorted(key=lambda x: x.id)]
                })
        if slide and slide.poll_response_ids.filtered(lambda x: x.user_id == request.env.user):
                result_dict = {}
                for response in slide.poll_response_ids:
                    for question in response.user_response_line:
                        key = question.poll_id.id
                        result_dict.setdefault(key, {})
                        for option in question.response_option_ids:
                            option_key = option.option_id.id
                            result_dict[key].setdefault(option_key, 0)
                            if option.selected_option:
                                result_dict[key][option_key] += 1
                parent_dict={}
                index=0
                for i,j in result_dict.items():
                    total_user=0
                    for k1,v1 in j.items():
                        total_user +=v1
                    for k,v in j.items():
                        value_per=v/total_user * 100
                        index+=1
                        parent_dict.update ({
                        k: math.trunc(round(value_per,0))
                        })
                values.update({'option_percentage': parent_dict})
        return values



   

        

