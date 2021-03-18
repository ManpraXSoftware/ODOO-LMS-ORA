# -*- coding: utf-8 -*-
{
    'name': 'eLearning with ORA',
    'description': 'Open Response Assessment',
    'category': 'Website/eLearning',
    'summary': 'Manage and publish an eLearning platform',
    'sequence': 125,
    'version': '2.0',
    'website': 'https://www.manprax.com',
    'author': 'ManpraX',
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
