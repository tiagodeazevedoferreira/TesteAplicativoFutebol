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
    # Extrair tabela de classificação
    url_classificacao = "https://eventos.admfutsal.com.br/evento/864"
    driver.get(url_classificacao)
    time.sleep(10)
    table_classificacao = WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, '.classification_table'))
    )
    rows_classificacao = table_classificacao.find_elements(By.TAG_NAME, 'tr')
    data_classificacao = []
    for row in rows_classificacao:
        cols = row.find_elements(By.TAG_NAME, 'td')
        cols = [col.text for col in cols]
        data_classificacao.append(cols)
    df_classificacao = pd.DataFrame(data_classificacao)
    print(f"Dados de classificação extraídos: {len(data_classificacao)} linhas.")

    # Extrair tabela de jogos
    url_jogos = "https://eventos.admfutsal.com.br/evento/864/jogos"
    driver.get(url_jogos)
    time.sleep(10)
    table_jogos = WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, 'table'))  # Ajuste este seletor se necessário
    )
    rows_jogos = table_jogos.find_elements(By.TAG_NAME, 'tr')
    data_jogos = []
    for row in rows_jogos:
        cols = row.find_elements(By.TAG_NAME, 'td')
        cols = [col.text.replace("Ver Súmula", "").strip() for col in cols]
        data_jogos.append(cols)

    # Processar a última coluna para quebrar em Mandante, Placar 1, X, Placar 2, Visitante
    formatted_jogos = []
    for row in data_jogos:
        if len(row) < 4:  # Garantir que haja pelo menos Data, Horário, Ginásio e a última coluna
            continue
        data = row[0] if len(row) > 0 else ""
        horario = row[1] if len(row) > 1 else ""
        ginasio = row[2] if len(row) > 2 else ""
        ultima_coluna = row[-1] if row else ""  # Última coluna com o jogo e placar

        # Quebrar a última coluna (ex.: "Time A 2 X 1 Time B" ou "Time A vs Time B (2 X 1)")
        mandante = ""
        placar1 = ""
        placar2 = ""
        visitante = ""

        if " vs " in ultima_coluna or " x " in ultima_coluna.lower():
            partes = ultima_coluna.replace(" vs ", " ").replace("(", "").replace(")", "").split()
            for i, parte in enumerate(partes):
                if parte.isdigit() and i > 0 and partes[i-1].isdigit():
                    placar2 = parte
                elif parte.isdigit():
                    placar1 = parte
                elif "x" in parte.lower():
                    continue  # Ignora o "x" ou "X"
                elif not placar1 and not mandante:
                    mandante = " ".join(partes[:i]).strip()
                elif placar2 or (placar1 and "x" in partes[i-1].lower()):
                    visitante = " ".join(partes[i+1:]).strip()

        formatted_jogos.append([data, horario, ginasio, mandante, placar1, "X", placar2, visitante])

    df_jogos = pd.DataFrame(formatted_jogos, columns=["Data", "Horário", "Ginásio", "Mandante", "Placar 1", "X", "Placar 2", "Visitante"])
    print(f"Dados de jogos formatados: {len(formatted_jogos)} linhas.")

except Exception as e:
    print(f"Erro ao extrair dados: {str(e)}")
    df_classificacao = pd.DataFrame()
    df_jogos = pd.DataFrame(columns=["Data", "Horário", "Ginásio", "Mandante", "Placar 1", "X", "Placar 2", "Visitante"])

finally:
    # Fechar o navegador
    driver.quit()

# Configurar credenciais para Google Sheets
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = Credentials.from_service_account_file('credentials.json', scopes=scope)
client = gspread.authorize(creds)

# Abrir a Google Sheet
spreadsheet = client.open("Futsal Classificação")
print(f"Planilha 'Futsal Classificação' aberta.")

# Função para garantir que a aba exista, criando-a se necessário
def ensure_worksheet(spreadsheet, title, rows=100, cols=20):
    try:
        sheet = spreadsheet.worksheet(title)
        print(f"Aba '{title}' encontrada com {sheet.row_count} linhas e {sheet.col_count} colunas.")
        return sheet
    except gspread.exceptions.WorksheetNotFound:
        print(f"Aba '{title}' não encontrada. Criando nova aba...")
        try:
            worksheets = spreadsheet.worksheets()
            for ws in worksheets:
                if title.lower() in ws.title.lower():
                    spreadsheet.del_worksheet(ws)
                    print(f"Aba '{ws.title}' removida por ser semelhante a '{title}'.")
            new_sheet = spreadsheet.add_worksheet(title=title, rows=rows, cols=cols)
            print(f"Aba '{title}' criada com sucesso.")
            return new_sheet
        except Exception as e:
            print(f"Erro ao criar a aba '{title}': {str(e)}")
            raise

# Garantir que as abas existam e atualizar
try:
    classificacao_sheet = ensure_worksheet(spreadsheet, "Classificação")
    classificacao_sheet.clear()
    result = classificacao_sheet.update([df_classificacao.columns.values.tolist()] + df_classificacao.values.tolist())
    print(f"Aba 'Classificação' atualizada com sucesso. Resposta da API: {result}")
except Exception as e:
    print(f"Erro ao atualizar a aba 'Classificação': {str(e)}")

try:
    placar_sheet = ensure_worksheet(spreadsheet, "Placar")
    placar_sheet.clear()
    result = placar_sheet.update([df_jogos.columns.values.tolist()] + df_jogos.values.tolist())
    print(f"Aba 'Placar' atualizada com sucesso. Resposta da API: {result}")
except Exception as e:
    print(f"Erro ao atualizar a aba 'Placar': {str(e)}")