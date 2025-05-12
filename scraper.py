from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
import pandas as pd
import time
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# Configurar o Selenium para rodar sem interface (headless)
options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')

# Iniciar o driver do Chrome
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

# Acessar o site
url = "https://eventos.admfutsal.com.br/evento/864"
driver.get(url)

# Esperar a página carregar (5 segundos, ajuste se necessário)
time.sleep(5)

# Extrair a tabela de classificação (ajuste o seletor se precisar)
table = driver.find_element(By.CSS_SELECTOR, 'table.classificacao')  # Verifique o seletor no site
rows = table.find_elements(By.TAG_NAME, 'tr')

data = []
for row in rows:
    cols = row.find_elements(By.TAG_NAME, 'td')
    cols = [col.text for col in cols]
    data.append(cols)

# Criar um DataFrame com os dados
df = pd.DataFrame(data)

# Fechar o navegador
driver.quit()

# Configurar credenciais para Google Sheets
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
client = gspread.authorize(creds)

# Abrir a Google Sheet (substitua pelo nome da sua planilha)
sheet = client.open("Futsal Classificação").sheet1

# Limpar a planilha e atualizar com os novos dados
sheet.clear()
sheet.update([df.columns.values.tolist()] + df.values.tolist())