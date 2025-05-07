from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
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

# --- Extração da Tabela de Classificação ---
# Acessar a página de classificação
url_classificacao = "https://eventos.admfutsal.com.br/evento/864"
driver.get(url_classificacao)

# Esperar a página carregar
time.sleep(5)

# Extrair a tabela de classificação
table_classificacao = driver.find_element(By.CSS_SELECTOR, 'table.classification_table')
rows_classificacao = table_classificacao.find_elements(By.TAG_NAME, 'tr')

data_classificacao = []
headers_classificacao = []
for i, row in enumerate(rows_classificacao):
    cols = row.find_elements(By.TAG_NAME, 'td')
    if i == 0:  # Primeira linha (cabeçalho)
        headers_classificacao = [col.text for col in row.find_elements(By.TAG_NAME, 'th')]
    else:  # Linhas de dados
        cols_data = [col.text for col in cols]
        data_classificacao.append(cols_data)

# Criar um DataFrame para a classificação
df_classificacao = pd.DataFrame(data_classificacao, columns=headers_classificacao)

# Remover a coluna "Chave" do DataFrame
if "Chave" in df_classificacao.columns:
    df_classificacao = df_classificacao.drop(columns=["Chave"])

# --- Extração da Tabela de Jogos ---
# Acessar a página de jogos
url_jogos = "https://eventos.admfutsal.com.br/evento/864/jogos"
driver.get(url_jogos)

# Esperar a página carregar
time.sleep(5)

# Extrair a tabela de jogos
table_jogos = driver.find_element(By.CSS_SELECTOR, 'table.table-hover')
rows_jogos = table_jogos.find_elements(By.TAG_NAME, 'tr')

data_jogos = []
headers_jogos = []
for i, row in enumerate(rows_jogos):
    cols = row.find_elements(By.TAG_NAME, 'td')
    if i == 0:  # Primeira linha (cabeçalho)
        headers_jogos = [col.text for col in row.find_elements(By.TAG_NAME, 'th')]
    else:  # Linhas de dados
        cols_data = [col.text for col in cols]
        # Processar a coluna "Resultado" se ela existir
        if len(cols_data) > headers_jogos.index("Resultado") if "Resultado" in headers_jogos else -1:
            resultado = cols_data[headers_jogos.index("Resultado")].split('\n')
            if len(resultado) >= 3:  # Verifica se há pelo menos Time 1, Placar e Time 2
                time_1 = resultado[0].strip()
                placar = resultado[1].strip()
                time_2 = resultado[2].strip()
                # Dividir o placar em três partes
                placar_parts = placar.split('x')
                if len(placar_parts) == 2:  # Formato esperado: "2 x 1"
                    placar_time_1 = placar_parts[0].strip()
                    placar_x = "x"
                    placar_time_2 = placar_parts[1].strip()
                else:  # Caso o placar não esteja no formato esperado
                    placar_time_1 = placar
                    placar_x = ""
                    placar_time_2 = ""
                cols_data[headers_jogos.index("Resultado")] = time_1  # Substitui Resultado por Time 1
                # Adicionar novas colunas para Placar (dividido) e Time 2
                if "" not in headers_jogos:  # Primeira coluna sem nome para placar_time_1
                    headers_jogos.append("")
                    for row_data in data_jogos:
                        row_data.append("")
                if "" not in headers_jogos[headers_jogos.index("") + 1:]:  # Segunda coluna sem nome para placar_x
                    headers_jogos.append("")
                    for row_data in data_jogos:
                        row_data.append("")
                if "" not in headers_jogos[headers_jogos.index("") + 2:]:  # Terceira coluna sem nome para placar_time_2
                    headers_jogos.append("")
                    for row_data in data_jogos:
                        row_data.append("")
                if "Time 2" not in headers_jogos:
                    headers_jogos.append("Time 2")
                    for row_data in data_jogos:
                        row_data.append("")
                cols_data.append(placar_time_1)
                cols_data.append(placar_x)
                cols_data.append(placar_time_2)
                cols_data.append(time_2)
        data_jogos.append(cols_data)

# Criar um DataFrame para os jogos
df_jogos = pd.DataFrame(data_jogos, columns=headers_jogos)

# Renomear colunas específicas na aba Jogos
df_jogos.columns = [col if col != "Resultado" else "Mandante" for col in df_jogos.columns]
df_jogos.columns = [col if col != "Time 2" else "Visitante" for col in df_jogos.columns]

# Fechar o navegador
driver.quit()

# Configurar credenciais para Google Sheets
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = Credentials.from_service_account_file('credentials.json', scopes=scope)
client = gspread.authorize(creds)

# Abrir a nova Google Sheet
spreadsheet = client.open("Teste Aplicacao Futebol")

# Verificar e criar/renomear a aba de classificação
try:
    sheet_classificacao = spreadsheet.worksheet("Classificação")
except gspread.exceptions.WorksheetNotFound:
    spreadsheet.add_worksheet(title="Classificação", rows=100, cols=20)
    sheet_classificacao = spreadsheet.worksheet("Classificação")

# Atualizar os dados da aba de classificação
sheet_classificacao.clear()
sheet_classificacao.update([df_classificacao.columns.values.tolist()] + df_classificacao.values.tolist())

# Verificar e criar a aba de jogos
try:
    sheet_jogos = spreadsheet.worksheet("Jogos")
except gspread.exceptions.WorksheetNotFound:
    spreadsheet.add_worksheet(title="Jogos", rows=100, cols=20)
    sheet_jogos = spreadsheet.worksheet("Jogos")

sheet_jogos.clear()
sheet_jogos.update([df_jogos.columns.values.tolist()] + df_jogos.values.tolist())
