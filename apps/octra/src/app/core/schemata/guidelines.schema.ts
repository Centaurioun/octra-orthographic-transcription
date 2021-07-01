export const GuidelinesSchema = {
  'properties': {
    'meta': {
      'properties': {
        'object_language': {
          'type': 'string'
        },
        'project': {
          'type': 'string'
        },
        'authors': {
          'type': 'string'
        },
        'version': {
          'type': 'string'
        },
        'date': {
          'type': 'string'
        },
        'encoding': {
          'type': 'string'
        },
        'validation_url': {
          'type': 'string'
        }
      },
      'type': 'object',
      'required': [
        'object_language',
        'project',
        'authors',
        'version',
        'date',
        'encoding',
        'validation_url'
      ]
    },
    'instructions': {
      'items': {
        'properties': {
          'group': {
            'type': 'string'
          },
          'entries': {
            'items': {
              'properties': {
                'code': {
                  'type': 'string'
                },
                'priority': {
                  'type': 'number'
                },
                'title': {
                  'type': 'string'
                },
                'description': {
                  'type': 'string'
                },
                'examples': {
                  'items': {
                    'properties': {
                      'annotation': {
                        'type': 'string'
                      },
                      'url': {
                        'type': 'string'
                      }
                    },
                    'type': 'object'
                  },
                  'type': 'array'
                }
              }
            },
            'type': 'array'
          }
        },
        'type': 'object'
      },
      'type': 'array'
    },
    'markers': {
      'items': {
        'properties': {
          'id': {
            'type': 'number'
          },
          'name': {
            'type': 'string'
          },
          'code': {
            'type': 'string'
          },
          'type': {
            'type': 'string'
          },
          'icon': {
            'type': 'string'
          },
          'button_text': {
            'type': 'string'
          },
          'description': {
            'type': 'string'
          },
          'shortcut': {
            'properties': {
              'mac': {
                'type': 'string'
              },
              'pc': {
                'type': 'string'
              }
            },
            'type': 'object'
          }
        },
        'type': 'object'
      },
      'type': 'array'
    }
  },
  'type': 'object',
  'required': [
    'meta',
    'instructions',
    'markers'
  ]
}
