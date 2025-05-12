from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd
import time
import gspread
from google.oauth2.service_account import Credentials

# Configurar o Selenium para rodar sem interface (headless)
options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')

# Iniciar o driver do Chrome
driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)

try:
    # Acessar o site
    url = "https://eventos.admfutsal.com.br/evento/864"
    driver.get(url)

    # Aumentar o tempo de espera inicial para carregar a página
    time.sleep(10)

    # Esperar até que a tabela esteja presente (máximo de 20 segundos)
    table = WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, '.classification_table'))
    )

    rows = table.find_elements(By.TAG_NAME, 'tr')

    data = []
    for row in rows:
        cols = row.find_elements(By.TAG_NAME, 'td')
        cols = [col.text for col in cols]
        data.append(cols)

    # Criar um DataFrame com os dados
    df = pd.DataFrame(data)

except Exception as e:
    print(f"Erro ao extrair dados do site: {str(e)}")
    df = pd.DataFrame()  # Criar um DataFrame vazio em caso de erro

finally:
    # Fechar o navegador
    driver.quit()

# Configurar credenciais para Google Sheets
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = Credentials.from_service_account_file('credentials.json', scopes=scope)
client = gspread.authorize(creds)

# Abrir a Google Sheet
spreadsheet = client.open("Futsal Classificação")

# Função para garantir que a aba exista, criando-a se necessário
def ensure_worksheet(spreadsheet, title, rows=100, cols=20):
    try:
        return spreadsheet.worksheet(title)
    except gspread.exceptions.WorksheetNotFound:
        return spreadsheet.add_worksheet(title=title, rows=rows, cols=cols)

# Garantir que as abas "Classificação" e "Placar" existam
classificacao_sheet = ensure_worksheet(spreadsheet, "Classificação")
classificacao_sheet.clear()
classificacao_sheet.update([df.columns.values.tolist()] + df.values.tolist())

placar_sheet = ensure_worksheet(spreadsheet, "Placar")
placar_sheet.clear()
placar_sheet.update([df.columns.values.tolist()] + df.values.tolist())