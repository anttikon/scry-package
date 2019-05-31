const fetch = require('node-fetch')
const {pick} = require('lodash')
const S3 = require('aws-sdk/clients/s3')
const s3 = new S3({apiVersion: '2006-03-01', params: {Bucket: 'scry-package'}})

const delay = t => new Promise(resolve => setTimeout(resolve, t))

async function fetchScryfallList(url) {
  const data = []
  let next_page = url
  while (next_page) {
    console.log('Fetching:', next_page)
    const response = await fetch(next_page)
    const json = await response.json()
    await delay(100)
    next_page = json.next_page
    if (json.data && json.data.length) {
      data.push(...json.data)
    }
  }
  return data
}

async function saveJsonToS3(key, json) {
  console.log(`Saving ${key} to S3`)
  const response = await s3.putObject({
    ACL: 'public-read',
    Bucket: 'scry-package',
    Key: key,
    Body: JSON.stringify(json),
    ContentType: 'application/json',
  }).promise()
  console.log(`Saved ${key} to S3`)
  return response
}

const ignoredSetTypes = ['promo', 'token', 'memorabilia']

async function saveSetsToS3() {
  const sets = await fetchScryfallList('https://api.scryfall.com/sets/')
  const expansions = sets.filter(set => !ignoredSetTypes.includes(set.set_type))
  await saveJsonToS3('sets.json', expansions.map(expansion => pick(expansion, ['name', 'code', 'released_at'])))
  return expansions
}

const fields = ['name', 'multiverse_ids', 'layout', 'mana_cost', 'type_line', 'oracle_text', 'colors', 'color_identity', 'set', 'set_name', 'released_at', 'collector_number', 'rarity', 'flavor_text', 'artist']

async function saveCardsToS3(expansions) {
  const cards = []
  for (expansion of expansions) {
    const expansionCards = await fetchScryfallList(expansion.search_uri)
    const processedCards = expansionCards
      .filter(card => !card.type_line.startsWith('Basic Land — ') && card.lang === 'en')
      .map(card => pick(card, fields))
    cards.push(...processedCards)

  }
  return saveJsonToS3('cards.json', cards)
}

async function main() {
  console.log('Begin parse')
  const expansions = await saveSetsToS3()
  await saveCardsToS3(expansions)
}

main()
  .then(() => console.log('All done!'))
  .catch(e => console.error(e))
