export const getDayIdentifier = () => {
  return Math.floor(Date.now() / (1000*60*60*24))
}

const ipFilter:{[key: string]: number} = {}
const keyFilter:{[key: string]: number} = {}
let dayFilter = { [getDayIdentifier()]: 0 }

const THRESHOLD = 1000*60*60*24*7 // 1 per 7 days
const MAX_ACC_CREATIONS_PER_DAY = 30
export const checkRateLimit = (ips: string[], keys: string[]) => {
  const now = Date.now()
  const dayId = getDayIdentifier()

  if(ips.some(ip => ipFilter[ip] && (now - ipFilter[ip]) < THRESHOLD)) {
    throw new Error(`It appears that you have already created a free WAX account.`)
  }
  if(keys.some(key => keyFilter[key] && (now - keyFilter[key]) < THRESHOLD)) {
    throw new Error(`It appears that you have already created a free WAX account.`)
  }
  if((dayFilter[dayId] || 0) > MAX_ACC_CREATIONS_PER_DAY) {
    throw new Error(`Reached the number of free account creations for today.`)
  }
}

export const addRateLimit = (ips: string[], keys: string[]) => {
  const now = Date.now()
  const dayId = getDayIdentifier()

  ips.forEach(ip => {
    ipFilter[ip] = now;
  })
  keys.forEach(key => {
    keyFilter[key] = now;
  })
  if(!dayFilter[dayId]) {
    dayFilter = { [dayId]: 0 }
  }
  dayFilter[dayId] = dayFilter[dayId] + 1
}