import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.on('pageerror', error => console.log('PAGEERROR', error.message));
await page.route('**/api/chatbot/message', async route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Respuesta de validación del asistente.' }) }));
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
console.log('start', page.url(), await page.locator('body').innerText().then(t=>t.slice(0,400)));
if (await page.getByPlaceholder('Ingresa tu usuario o correo').count()) {
  await page.getByPlaceholder('Ingresa tu usuario o correo').fill('admin');
  await page.getByPlaceholder('••••••••••').fill('admin123');
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.waitForTimeout(700);
}
console.log('loaded', page.url(), await page.locator('body').innerText().then(t=>t.slice(0,500)));
const launch = page.getByRole('button', { name: /abrir chat|asistente|chat/i }).last();
console.log('buttons', await page.getByRole('button').allTextContents());
await page.getByRole('button', { name: 'Abrir asistente AMATI' }).click();
await page.waitForTimeout(250);
console.log('dialog', await page.getByRole('dialog', { name: 'Asistente AMATI' }).count());
await page.screenshot({ path: 'qa-chatbot-mobile-fresh.png', fullPage: true });
await browser.close();


