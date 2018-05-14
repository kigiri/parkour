import test from 'ava'
import fs from 'fs'
import { join } from 'path'
const read = file => fs.createReadStream(join(__dirname, `test/${file}.html`))

const parkour = require('./index.js')
const getBody = parkour('body')

test('parkour from stream', async t => {
  const body = await getBody(read('google'))

  t.is(body.type, 'tag', 'expect body.type to be "tag"')
  t.is(body.name, 'body', 'expect body.name to be "body"')

  const gb_3 = parkour.$$('.gb_3', body)
  t.true(Array.isArray(gb_3), 'expect gb_3 to be an Array')
  t.is(gb_3.length, 19, 'expect gb_3 to contain 19 elements')
  t.deepEqual(gb_3, parkour.$$('.gb_3')(body),
    'expect $$ to work the same if curry')

  const gb_3Texts = parkour.toText(gb_3)
  t.deepEqual(gb_3Texts, [
    'My Account',
    'Search',
    'Maps',
    'YouTube',
    'Play',
    'Gmail',
    'Drive',
    'Calendar',
    'Google+',
    'Translate',
    'Photos',
    'Shopping',
    'Docs',
    'Books',
    'Blogger',
    'Contacts',
    'Hangouts',
    'Keep',
    'Earth' ], 'expect gb_3 to contain 19 elements')
})
