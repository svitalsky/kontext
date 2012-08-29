"""
This module wraps application's configuration (as specified in config.xml) and provides some additional helper
methods.
"""
import os
import MySQLdb
from lxml import etree

_conf = {}

_user = None

_corplist = None

def get(section, key=None, default=None):
    """
    TODO
    """
    if key is None and section in _conf:
        return _conf[section]
    elif section in _conf and key in _conf[section]:
        return _conf[section][key]
    return default

def parse_corplist(root, path='/', data=[]):
    """
    """
    if not hasattr(root, 'tag') or not root.tag == 'corplist':
        return data
    if root.attrib['title']:
        path = "%s%s/" % (path, root.attrib['title'])
    for item in root:
        if not hasattr(item, 'tag'):
            continue
        elif item.tag == 'corplist':
            parse_corplist(item, path, data)
        elif item.tag == 'corpus':
            data.append((item.attrib['id'].lower(), path))

def parse_config(path):
    """
    """
    xml = etree.parse(open(path))
    _conf['global'] = {}
    for item in xml.find('global'):
        _conf['global'][item.tag] = item.text
    _conf['database'] = {}
    for item in xml.find('database'):
        _conf['database'][item.tag] = item.text
    _conf['corpora'] = {}
    for item in xml.find('corpora'):
        if item.tag != 'corplist':
            _conf['corpora'][item.tag] = item.text
        else:
            data = []
            parse_corplist(item, data=data)
            _conf['corpora_hierarchy'] = data

def load(user, conf_path='config.xml'):
    """
    Loads application's configuration from provided file

    Parameters
    ----------
    user : str
    conf_path : str, optional (default is 'config.xml')
      path to the configuration XML file
    """
    global _user

    _user = user
    parse_config(conf_path)
    os.environ['MANATEE_REGISTRY'] = get('corpora', 'manatee_registry')

def get_default_corpus(corplist):
    """
    Returns name of the default corpus to be offered to a user

    Parameters
    ----------
    corplist : list or tuple of str
      list of corpora names

    Returns
    -------
    str
      name of the corpus to be used as a default one
    """
    # set default corpus
    if get('corpora', 'default_corpus') in corplist:
        return get('corpora', 'default_corpus')
    else:
        return get('corpora', 'alternative_corpus')

def get_corplist():
    """
    Fetches list of available corpora according to provided user

    Returns
    -------
    list
      list of corpora names (sorted alphabetically) available to current user (specified in the _user variable)
    """
    global _corplist

    if _corplist is None:
        conn = MySQLdb.connect (host=get('database', 'host'), user=get('database', 'username'),
            passwd=get('database', 'password'), db=get('database', 'name'))
        cursor = conn.cursor ()
        cursor.execute ("SELECT corplist, sketches FROM user WHERE user LIKE '%s'" % _user)
        row = cursor.fetchone()

        c = row[0].split()
        corpora = []

        for i in c:
            if i[0] == '@':
                i = i[1:len(i)]
                cursor.execute("""SELECT corpora.name
                FROM corplist,relation,corpora
                WHERE corplist.id=relation.corplist
                  AND relation.corpora=corpora.id
                  AND corplist.name='%s'""" % i)
                row = cursor.fetchall()

                for y in row:
                    corpora.append(y[0])
            else:
                corpora.append(i)
        cursor.close()
        conn.close()
        path_info =  os.getenv('PATH_INFO')

        if path_info in ('/wsketch_form', '/wsketch', '/thes_form', '/thes', '/wsdiff_form', '/wsdiff'):
            r = []
            for ws in range(len(corpora)):
                c = manatee.Corpus(corpora[ws]).get_conf('WSBASE')
                if c == 'none':
                    r.append(corpora[ws])
            for x in r:
                corpora.remove(x)
        corpora.sort()
        _corplist = corpora
    return _corplist

def user_has_access_to(corpname):
    """
    Tests whether the current user has access to provided corpus name
    """
    return corpname in get_corplist()

def is_debug_mode():
    value = get('global', 'debug')
    return value is not None and value.lower() in ('true', '1')

def has_configured_speech(corpus):
    """
    Tests whether the provided corpus contains
    structural attributes compatible with current application's configuration
    (e.g. corpus contains structural attribute seg.id and the configuration INI
    file contains line speech_segment_struct_attr = seg.id).

    Parameters
    ----------
    corpus : manatee.Corpus
      corpus object we want to test
    """
    return get('corpora', 'speech_segment_struct_attr') in corpus.get_conf('STRUCTATTRLIST').split(',')

def get_speech_structure():
    return get('corpora', 'speech_segment_struct_attr').split('.')[0]

def create_speech_url(speech_id):
    speech_url = get('corpora', 'speech_data_url')
    if speech_url[-1] <> '/':
        speech_url += '/'
    return "%s%s" % (speech_url, speech_id)

if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1:
        parse_config(sys.argv[1])
        corplist = _conf['corpora_hierarchy']
        del(_conf['corpora_hierarchy'])
        for block in _conf:
            print('\n[%s]' % block)
            for key in _conf[block]:
                if key.find('passw') == -1:
                    value = _conf[block][key]
                else:
                    value = '******'
                print('%s: %s' % (key, value))
        print('\n[corpora hierarchy]')
        for corpname, path in corplist:
            print('%s%s' % (path, corpname))
    else:
        print('No config XML specified')
