const redis = require('./index')

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
  }
}

module.exports = targets
