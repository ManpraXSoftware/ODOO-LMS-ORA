# -*- coding: utf-8 -*-

from odoo import models, fields, api, _
from odoo.exceptions import ValidationError


class SlidePoll(models.Model):
    _inherit='slide.slide'
    _order = "sequence"

    sequence = fields.Integer("Sequence")
    poll_ids = fields.One2many('poll.poll', 'slide_id', string="Question")
    poll_response_ids = fields.Many2many('poll.response', string="Responses", compute="_get_poll_user_responses")
    poll_response_count = fields.Integer("Poll Responses", compute="_get_poll_user_responses")

    def _get_poll_user_responses(self):
        for rec in self:
            rec.poll_response_ids = False
            rec.poll_response_count = 0
            total_response = []
            if rec.poll_ids:
                user_response_ids = self.env['poll.response'].search([
                    ('slide_id', '=', rec.id)
                ])
                if user_response_ids:
                    rec.poll_response_ids = [(6, 0, user_response_ids.ids)]
                    for response in user_response_ids:
                        if not response.user_id in total_response:
                            total_response.append(response.user_id)
                    rec.poll_response_count = len(total_response)
    
    def action_poll_responses(self):
        action = self.env['ir.actions.act_window']._for_xml_id('web_elearning_poll.action_poll_response')
        action['domain'] = [('id', 'in', self.poll_response_ids.ids)]
        return action

class PollQuestion(models.Model):
    _name = "poll.poll"
    _description = "Slide's Poll"
    _order = 'sequence'
    _rec_name = 'quest_text'

    sequence = fields.Integer("Sequence")
    quest= fields.Html("Question Name(Rich Text)", translate=True)
    quest_text = fields.Char("Question Name(Text)",translate=True)
    text_type = fields.Selection([
        ('text', 'Text'),
        ('rich_text', 'Rich Text')
    ], default='text', string="Question Type", required=True)
    option_type = fields.Selection([ 
        ('text', 'Text'),
        ('rich_text', 'Rich Text')
    ], default='text', string="Option Type", required=True)
    option_ids = fields.One2many('poll.option', 'poll_option_ids', string="Option")
    slide_id = fields.Many2one('slide.slide', ondelete='cascade')
    

    @api.constrains('option_ids')
    def _check_option(self):
        if self.quest_text or self.quest:
            for question in self:
                if len(question.option_ids) <= 1 and question.quest:
                    raise ValidationError(_('Question "%s" must have more than 1 option',question.quest))
                elif  len(question.option_ids) <= 1 and question.quest_text:
                    raise ValidationError(_('Question "%s" must have more than 1 option',question.quest_text))



class PollOption(models.Model):
    _name = "poll.option"
    _order = 'sequence'

    sequence = fields.Integer("Sequence")
    poll_option_ids = fields.Many2one("poll.poll", ondelete = "cascade")
    option_value = fields.Html("Option", translate=True)
    option_text_value = fields.Char("Option", translate=True)
    

class PollResponse(models.Model):
    _name = 'poll.response'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _rec_name = 'slide_id'
   
    slide_id = fields.Many2one('slide.slide', "Content")
    user_id = fields.Many2one('res.users', "User")
    user_response_line = fields.One2many('user.poll.response', 'response_id' , string="Polls")
    submitted_date = fields.Datetime("Submitted Date", readonly=False)


class UserPollResponse(models.Model):
    _name = "user.poll.response"

    response_id = fields.Many2one('poll.response', ondelete="cascade")
    poll_id = fields.Many2one("poll.poll")
    response_option_ids = fields.One2many('user.option.response','user_option_ids', string="Options") 

class ResponseOptions(models.Model):
    _name = "user.option.response"
    
    user_option_ids = fields.Many2one('user.poll.response', ondelete="cascade")
    option_id = fields.Many2one('poll.option')
    selected_option = fields.Boolean(string="Selected Option")
    option_name = fields.Char(string="Option(Text)")
    option_richname = fields.Html(string="Option(Rich Text)")
    selected_option_name = fields.Char(string="Response",compute='_compute_name')
    selected_option_richname = fields.Html(string="Response")

    # @api.depends('option_id','selected_option')
    # def _compute_name(self):
    #     for rec in self.option_id:
    #         if self.selected_option == True:
    #             if self.option_id.option_name:
    #                 self.selected_option_name == self.option_id.option_name
    #             else :
    #                 self.selected_option_richname == self.option_id.option_richname

    