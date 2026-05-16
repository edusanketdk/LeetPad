import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

const saved = localStorage.getItem('leetpad-theme')
const useDark =
  saved === 'dark' || (saved !== 'light' && globalThis.matchMedia('(prefers-color-scheme: dark)').matches)
document.documentElement.classList.toggle('dark', useDark)

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
