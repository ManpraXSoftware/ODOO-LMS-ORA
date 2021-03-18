# -*- coding: utf-8 -*-
{
    'name': 'LMS eLearning with ORA',
    'description': 'Open Response Assessment',
    'category': 'Website/eLearning',
    'summary': 'Manage and publish an eLearning platform',
    'sequence': 10,
    'version': '1.0',
    'website': 'https://www.manprax.com',
    'author': 'ManpraX Software LLP',
    'depends': ['website_slides'],
    'data': [
        'security/ir.model.access.csv',
        'views/slide_assessment_view.xml',
        'views/templates.xml',
    ],
    'qweb': [],
    'images': ["static/description/images/banner.png"],
    'application': True,
    'license': 'AGPL-3',
}
