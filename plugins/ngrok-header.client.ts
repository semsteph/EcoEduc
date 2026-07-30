import axios from 'axios'

export default defineNuxtPlugin(() => {
  axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true'
})
