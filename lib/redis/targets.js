const redis = require('./index')
const { promisify } = require('util')
const getAsync = promisify(redis.get).bind(redis)
const incrAsync = promisify(redis.incr).bind(redis)
const sortAsync = promisify(redis.sort).bind(redis)
const delAsync = promisify(redis.del).bind(redis)

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
      let target = await targets.getById(data.id)

      if (!target) {
        console.log('no target')
        return false
      }

      let now = new Date()
      date = now.toISOString().split('T')[0]
      
      let count = await getAsync(`count:target:${data.id}:${date}`)
      console.log('count ==>', count)
      console.log('maxAcceptsPerDay ==>', target.maxAcceptsPerDay)

      if (!count || count < parseInt(target.maxAcceptsPerDay)) {
        if (!count) {
          let counts_set = await sortAsync(`counts:target:${data.id}`, 'by', `count:target:${data.id}->date`, 'get', '*')
          
          if (counts_set.length > 0) {
            console.log('counts_set ==>', counts_set)
            await delAsync(counts_set[0])
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
                reject(false)
              }
    
              console.log('redis result ==>', data)
    
              resolve(true)
            })
        })
      } else {
        return false
      }
    } catch (error) {
      return false;
    }
  }
}

module.exports = targets
