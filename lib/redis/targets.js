const redis = require('./index')
const { promisify } = require('util')
const getAsync = promisify(redis.get).bind(redis)
const smembersAsync = promisify(redis.smembers).bind(redis)
const delAsync = promisify(redis.del).bind(redis)
const sremAsync = promisify(redis.srem).bind(redis)

const _id = () => {
  return new Promise((resolve, reject) => {
    redis
      .incr('id:targets', (err, data) => {
        if (err) reject(err)

        resolve(data)
      })
  })
}

const targets = {
  add: (target) => {
    return new Promise(async (resolve, reject) => { // eslint-disable-line
      var id = await _id()

      target.id = id

      redis
        .multi()
        .set('target:' + id, JSON.stringify(target))
        .sadd('targets:all', 'target:' + id)
        .exec((err, data) => {
          if (err) {
            console.log('reids add error ==>', err)
            reject(err)
          }

          console.log('redis add result ==>', data)

          resolve(true)
        })
    })
  },
  getAll: () => {
    return new Promise((resolve, reject) => {
      redis
        .sort('targets:all', 'by', 'target:*->id', 'get', '*', (err, data) => {
          if (err) {
            console.log('reids get all error ==>', err)
            reject(err)
          }

          var res = data.map(el => JSON.parse(el))
          console.log(res)

          resolve(res)
        })
    })
  },
  getById: (id) => {
    return new Promise((resolve, reject) => {
      redis
        .get('target:' + id, (err, data) => {
          if (err) {
            console.log('reids add error ==>', err)
            reject(err)
          }

          console.log('redis getById result ==>', JSON.parse(data))

          resolve(JSON.parse(data))
        })
    })
  },
  updateById: (id, data) => {
    return new Promise((resolve, reject) => {
      targets
        .getById(id)
        .then(target => {
          var updatedTarget = { ...target, ...data }
          console.log('updatedTarget ==>', updatedTarget)

          redis
            .set('target:' + id, JSON.stringify(updatedTarget), (err) => {
              if (err) {
                console.log('reids updateById error ==>', err)
                reject(err)
              }

              resolve(true)
            })
        })
        .catch((err) => {
          console.log(err)
          reject(err)
        })
    })
  },
  decision: async (data) => {
    try {
      const target = await targets.getById(data.id)

      if (!target) {
        console.log('no target')
        return false
      }

      const now = new Date()
      const date = now.toISOString().split('T')[0]

      const count = await getAsync(`count:target:${data.id}:${date}`)

      if (!count || count < parseInt(target.maxAcceptsPerDay)) {
        if (!count) {
          const countSet = await smembersAsync(`counts:target:${data.id}`)
          console.log('countSet ==>', countSet)

          if (countSet.length > 0) {
            await delAsync(countSet[0])
            await sremAsync(`counts:target:${data.id}`, countSet[0])
          }
        }

        return new Promise(async (resolve, reject) => { // eslint-disable-line
          redis
            .multi()
            .incr(`count:target:${data.id}:${date}`)
            .sadd(`counts:target:${data.id}`, `count:target:${data.id}:${date}`)
            .exec((err, data) => {
              if (err) {
                console.log('reids error ==>', err)
                reject(err)
              }

              console.log('redis result ==>', data)

              resolve(true)
            })
        })
      } else {
        const currentHour = now.getHours()
        const acceptGeoStates = target.accept.geoState.$in
        const acceptHours = target.accept.hour.$in

        if (acceptGeoStates.includes(data.geoState) && acceptHours.includes(currentHour)) {
          return true
        }

        return false
      }
    } catch (error) {
      return false
    }
  }
}

module.exports = targets
