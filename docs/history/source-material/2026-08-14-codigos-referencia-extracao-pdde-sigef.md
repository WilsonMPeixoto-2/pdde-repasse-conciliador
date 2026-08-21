Aqui estão os códigos completos, autônomos e prontos para uso em diferentes ecossistemas (**Python**, **Node.js / TypeScript**, **Power BI / Excel (Power Query M)**, **PowerShell / cURL** e **Postman**), permitindo que você ou qualquer outra ferramenta replique com exatidão os resultados obtidos.

---

## 1. Implementação em Python (Data Science & Automação)
> **Dependências:** `pip install requests beautifulsoup4 pandas openpyxl`

Este script executa a auditoria completa da escola, classifica as transações e pode salvar o resultado diretamente em um arquivo **Excel (`.xlsx`)** ou **JSON**.

```python
import re
import hashlib
import requests
from bs4 import BeautifulSoup
import pandas as pd

# Mapeamento Canônico dos Programas FNDE
PROGRAM_MAP = {
    'PDDE': '02',
    'PDDE BASICO': '02',
    'PDDE BÁSICO': '02',
    'PDDE QUALIDADE': '0B',
    'PDDE EQUIDADE': '0A',
    'PDDE EDUCACAO INTEGRAL': 'Z9',
    'PDDE EDUCAÇÃO INTEGRAL': 'Z9'
}

def canonical_account(acc: str, length: int = 10) -> str:
    """Remove pontuação, preserva dígitos e o caractere X maiúsculo com padding."""
    clean = re.sub(r'[^0-9A-Za-z]', '', acc).upper()
    return clean.zfill(length)

def classify_movement(history: str, is_credit: bool, is_fnde: bool) -> tuple[str, bool, str]:
    """Classificação determinística contábil (Resolução FNDE nº 15/2021)."""
    h = history.upper()
    if is_credit and ('ORDEM BANCARIA' in h or is_fnde):
        return 'REPASSE_FNDE', False, ''
    if any(k in h for k in ['BB-APLIC', 'APLICACAO EM BB FIX', 'APL.AUT']):
        return 'APLICACAO_FINANCEIRA', False, ''
    if any(k in h for k in ['RESGATE AUTOMATICO', 'RESGATE BB FIX']):
        return 'RESGATE_APLICACAO', False, ''
    if 'TARIFA' in h:
        return 'TARIFA_BANCARIA', True, 'Cobrança de tarifa bancária em conta isenta (Res. FNDE 15/2021).'
    if any(k in h for k in ['CH DEVOLVIDO', 'ESTORNO']):
        return 'FATO_REVERSOR', True, 'Cheque devolvido ou movimentação de estorno.'
    if is_credit:
        return 'ENTRADA_TERCEIRO', True, 'Crédito não originado de Ordem Bancária FNDE.'
    if 'CARTAO' in h:
        return 'PAGAMENTO_CARTAO', False, ''
    return 'PAGAMENTO_FORNECEDOR', False, ''

def auditar_escola(inep: str, ano: str = "2026") -> dict:
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9'
    })

    print(f"\n[+] Auditando INEP: {inep} (Exercício {ano})...")
    
    # 1. PDDEInfo
    pdde_url = f"https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar?ano={ano}&co_escola={inep}&consultar=Consultar"
    res_pdde = session.get(pdde_url, timeout=15)
    soup_pdde = BeautifulSoup(res_pdde.content, 'html.parser', from_encoding='latin-1')

    # CNPJ da UEx
    cnpj_match = re.search(r'(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})', soup_pdde.get_text())
    cnpj_limpo = re.sub(r'\D', '', cnpj_match.group(1)) if cnpj_match else ''
    
    # Contas e Repasses
    contas = []
    repasses = []
    for tr in soup_pdde.find_all('tr'):
        tds = [td.get_text(strip=True) for td in tr.find_all(['td', 'th'])]
        # Linha de conta bancária
        if len(tds) >= 5 and re.match(r'^\d{3}$', tds[1]) and re.match(r'^\d+', tds[2]):
            prog_clean = tds[0].upper()
            prog_code = PROGRAM_MAP.get(prog_clean, '02')
            contas.append({
                'programa_nome': tds[0],
                'programa_codigo': prog_code,
                'banco': tds[1].zfill(3),
                'agencia': tds[2].zfill(4),
                'conta_raw': tds[3],
                'conta_canon': canonical_account(tds[3]),
                'saldo': tds[4]
            })
        # Linha de repasse 2026
        if len(tds) >= 10 and tds[-1] and f'/{ano}' in tds[-1]:
            repasses.append({
                'acao': tds[0],
                'valor_previsto': tds[3],
                'valor_pago': tds[10] if len(tds) > 10 else tds[-2],
                'data_pagamento': tds[-1]
            })

    # 2. SIGEF Extrato Direto
    movimentacoes_2026 = []
    for c in contas:
        sigef_url = (
            f"https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/"
            f"banco/{c['banco']}/agencia/{c['agencia']}/contacorrente/{c['conta_canon']}/"
            f"cnpj/{cnpj_limpo}/programa/{c['programa_codigo']}/data/08{ano}"
        )
        res_sigef = session.get(sigef_url, timeout=15)
        if res_sigef.status_code == 200 and "Nenhum registro encontrado" not in res_sigef.text:
            soup_sigef = BeautifulSoup(res_sigef.content, 'html.parser', from_encoding='latin-1')
            for tr in soup_sigef.find_all('tr'):
                tds = [td.get_text(strip=True) for td in tr.find_all(['td', 'th'])]
                if len(tds) >= 10 and re.match(r'^\d{2}/\d{2}/\d{4}$', tds[0]):
                    data_mov = tds[0]
                    if data_mov.endswith(f'/{ano}'):
                        credito = float(tds[1].replace('.', '').replace(',', '.')) if tds[1] != '0' else 0.0
                        debito = float(tds[2].replace('.', '').replace(',', '.')) if tds[2] != '0' else 0.0
                        is_credit = credito > 0.0
                        valor = credito if is_credit else debito
                        historico = tds[4]
                        ben_doc = tds[5] if tds[5] != '-' else ''
                        ben_nome = tds[6] if tds[6] != '-' else ''
                        
                        is_fnde = '00.378.257' in ben_doc or 'FUNDO NACIONAL' in ben_nome
                        categoria, precisa_revisao, motivo = classify_movement(historico, is_credit, is_fnde)

                        movimentacoes_2026.append({
                            'conta': c['conta_raw'],
                            'data': data_mov,
                            'operacao': 'CRÉDITO' if is_credit else 'DÉBITO',
                            'valor': valor,
                            'documento': tds[3],
                            'historico': historico,
                            'classificacao': categoria,
                            'favorecido_doc': ben_doc,
                            'favorecido_nome': ben_nome,
                            'alerta_auditoria': motivo
                        })

    return {
        'inep': inep,
        'cnpj': cnpj_limpo,
        'contas': contas,
        'repasses': repasses,
        'movimentacoes_2026': movimentacoes_2026
    }

# Teste com a E.M. Pedro Lessa (33069379)
if __name__ == '__main__':
    resultado = auditar_escola('33069379')
    print("\n--- REPASSES 2026 ---")
    print(pd.DataFrame(resultado['repasses']))
    print("\n--- MOVIMENTAÇÕES 2026 NO SIGEF ---")
    print(pd.DataFrame(resultado['movimentacoes_2026']))
```

---

## 2. Implementação em TypeScript / Node.js (Ambiente Canônico)
> **Dependências:** `npm install cheerio undici`

```typescript
import { fetch } from 'undici';
import * as cheerio from 'cheerio';

const PROGRAM_MAP: Record<string, string> = {
  'PDDE': '02',
  'PDDE BASICO': '02',
  'PDDE BÁSICO': '02',
  'PDDE QUALIDADE': '0B',
  'PDDE EQUIDADE': '0A',
  'PDDE EDUCACAO INTEGRAL': 'Z9',
  'PDDE EDUCAÇÃO INTEGRAL': 'Z9'
};

function canonicalAccount(acc: string): string {
  return acc.replace(/[^0-9A-Za-z]/g, '').toUpperCase().padStart(10, '0');
}

export async function auditarEscolaNode(inep: string, ano = '2026') {
  const pddeUrl = `https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar?ano=${ano}&co_escola=${inep}&consultar=Consultar`;
  const resPdde = await fetch(pddeUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const bufPdde = Buffer.from(await resPdde.arrayBuffer());
  const htmlPdde = bufPdde.toString('latin1');

  const cnpjMatch = htmlPdde.match(/([0-9]{2}\.[0-9]{3}\.[0-9]{3}\/[0-9]{4}-[0-9]{2})/);
  const cnpj = cnpjMatch ? cnpjMatch[1].replace(/\D/g, '') : '';

  const $ = cheerio.load(htmlPdde);
  const contas: Array<{ prog: string; code: string; banco: string; agencia: string; conta: string }> = [];

  $('table tr').each((_, el) => {
    const tds = $(el).find('td, th').map((_, cell) => $(cell).text().trim()).get();
    if (tds.length >= 5 && /^\d{3}$/.test(tds[1]) && /^\d+/.test(tds[2])) {
      const code = PROGRAM_MAP[tds[0].toUpperCase()] || '02';
      contas.push({
        prog: tds[0],
        code,
        banco: tds[1].padStart(3, '0'),
        agencia: tds[2].padStart(4, '0'),
        conta: canonicalAccount(tds[3])
      });
    }
  });

  const movimentacoes: any[] = [];
  for (const c of contas) {
    const sigefUrl = `https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/${c.banco}/agencia/${c.agencia}/contacorrente/${c.conta}/cnpj/${cnpj}/programa/${c.code}/data/08${ano}`;
    const resSigef = await fetch(sigefUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const bufSigef = Buffer.from(await resSigef.arrayBuffer());
    const htmlSigef = bufSigef.toString('latin1');

    if (!htmlSigef.includes('Nenhum registro encontrado')) {
      const $s = cheerio.load(htmlSigef);
      $s('table tr').each((_, el) => {
        const cells = $s(el).find('td, th').map((_, cell) => $(cell).text().trim()).get();
        if (cells.length >= 10 && cells[0].endsWith(`/${ano}`)) {
          movimentacoes.push({
            conta: c.conta,
            programa: c.code,
            data: cells[0],
            credito: cells[1],
            debito: cells[2],
            documento: cells[3],
            historico: cells[4],
            favorecidoDoc: cells[5] !== '-' ? cells[5] : null,
            favorecidoNome: cells[6] !== '-' ? cells[6] : null
          });
        }
      });
    }
  }

  return { inep, cnpj, contas, movimentacoes };
}
```

---

## 3. Código M (Power Query) para Power BI e Excel

Você pode colar esta função diretamente no **Editor Avançado do Power Query** no Power BI ou Excel para carregar os extratos do SIGEF automaticamente:

```powerquery
// Função: fnObterExtratoSIGEF
(Banco as text, Agencia as text, Conta as text, Cnpj as text, Programa as text, MesAno as text) as table =>
let
    // Formatação estrita dos parâmetros
    BancoPadded = Text.PadStart(Text.Select(Banco, {"0".."9"}), 3, "0"),
    AgenciaPadded = Text.PadStart(Text.Select(Agencia, {"0".."9"}), 4, "0"),
    ContaClean = Text.PadStart(Text.Upper(Text.Select(Conta, {"0".."9", "A".."Z"})), 10, "0"),
    CnpjClean = Text.Select(Cnpj, {"0".."9"}),
    
    // Constrói URL
    Url = "https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/" 
          & BancoPadded & "/agencia/" & AgenciaPadded & "/contacorrente/" & ContaClean 
          & "/cnpj/" & CnpjClean & "/programa/" & Programa & "/data/" & MesAno,
          
    // Requisição HTTP com Encoding Latin1 (Windows-1252 / 1252)
    Fonte = Web.Contents(Url, [Headers=[#"User-Agent"="Mozilla/5.0", #"Accept"="text/html"]]),
    Html = Html.Table(Fonte, {
        {"Data", "td:nth-child(1)"},
        {"Credito", "td:nth-child(2)"},
        {"Debito", "td:nth-child(3)"},
        {"Documento", "td:nth-child(4)"},
        {"Historico", "td:nth-child(5)"},
        {"Favorecido_Doc", "td:nth-child(6)"},
        {"Favorecido_Nome", "td:nth-child(7)"},
        {"Favorecido_Banco", "td:nth-child(8)"}
    }, [RowSelector="table tr"]),
    
    // Filtra cabeçalhos e linhas inválidas
    LinhasFiltradas = Table.SelectRows(Html, each [Data] <> "Data" and [Data] <> null and Text.Contains([Data], "/"))
in
    LinhasFiltradas
```

---

## 4. Script em PowerShell (Para Execução Direta no Terminal Windows)

Salve como `consultar_escola.ps1` e execute no PowerShell:

```powershell
param(
    [Parameter(Mandatory=$true)][string]$Inep,
    [string]$Ano = "2026"
)

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "1. Consultando PDDEInfo para INEP $Inep..." -ForegroundColor Yellow

$pddeUrl = "https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar?ano=$Ano&co_escola=$Inep&consultar=Consultar"
$pddeRes = Invoke-WebRequest -Uri $pddeUrl -UseBasicParsing
$htmlPdde = [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($pddeRes.RawContentStream.ToArray())

# Extrair CNPJ
$cnpjMatch = [regex]::Match($htmlPdde, '(\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2})')
if (-not $cnpjMatch.Success) {
    Write-Host "CNPJ não localizado." -ForegroundColor Red
    return
}
$cnpjLimpo = $cnpjMatch.Value -replace '\D', ''
Write-Host "CNPJ UEx: $($cnpjMatch.Value) ($cnpjLimpo)" -ForegroundColor Green

# Extrair Contas Bancárias
$contaMatches = [regex]::Matches($htmlPdde, '<tr>\s*<td>([^<]+)</td>\s*<td>(\d{3})</td>\s*<td>(\d+)</td>\s*<td>([^<]+)</td>\s*<td>([^<]+)</td>')

foreach ($m in $contaMatches) {
    $progNome = $m.Groups[1].Value.Trim()
    $banco = $m.Groups[2].Value.Trim().PadLeft(3, '0')
    $agencia = $m.Groups[3].Value.Trim().PadLeft(4, '0')
    $contaRaw = $m.Groups[4].Value.Trim()
    $contaCanon = ($contaRaw -replace '[^0-9A-Za-z]', '').ToUpper().PadLeft(10, '0')
    
    $progCode = if ($progNome -match "QUALIDADE") { "0B" } elseif ($progNome -match "EQUIDADE") { "0A" } else { "02" }

    Write-Host "`n2. Consultando SIGEF Extrato: $progNome (Conta: $contaCanon)..." -ForegroundColor Yellow
    $sigefUrl = "https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/$banco/agencia/$agencia/contacorrente/$contaCanon/cnpj/$cnpjLimpo/programa/$progCode/data/08$Ano"
    
    $sigefRes = Invoke-WebRequest -Uri $sigefUrl -UseBasicParsing
    $htmlSigef = [System.Text.Encoding]::GetEncoding("ISO-8859-1").GetString($sigefRes.RawContentStream.ToArray())

    if ($htmlSigef -notmatch "Nenhum registro encontrado") {
        $txMatches = [regex]::Matches($htmlSigef, '<tr>\s*<td>(\d{2}/\d{2}/\d{4})</td>\s*<td>([^<]*)</td>\s*<td>([^<]*)</td>\s*<td>([^<]*)</td>\s*<td>([^<]*)</td>\s*<td>([^<]*)</td>\s*<td>([^<]*)</td>')
        foreach ($tx in $txMatches) {
            $data = $tx.Groups[1].Value
            if ($data -match "/$Ano$") {
                $credito = $tx.Groups[2].Value.Trim()
                $debito = $tx.Groups[3].Value.Trim()
                $tipo = if ($credito -ne "0") { "CRÉDITO: R$ $credito" } else { "DÉBITO: R$ $debito" }
                $hist = $tx.Groups[5].Value.Trim()
                $fav = $tx.Groups[7].Value.Trim()
                Write-Host "  * $data | $tipo | $hist | Favorecido: $fav" -ForegroundColor White
            }
        }
    }
}
```

---

## 5. Coleção de Requisições para Postman / Insomnia

Para importar e testar requisições individuais no Postman:

### Requisição 1: Consulta PDDEInfo
* **Método:** `GET`
* **URL:** `https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar?ano=2026&co_escola=33069379&consultar=Consultar`
* **Headers:**
  * `User-Agent`: `Mozilla/5.0 (Windows NT 10.0; Win64; x64)`
  * `Accept`: `text/html,application/xhtml+xml`

### Requisição 2: Detalhamento de Extrato SIGEF (E.M. Pedro Lessa)
* **Método:** `GET`
* **URL:** `https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0249/contacorrente/0000549819/cnpj/04974720000109/programa/02/data/082026`

### Requisição 3: Detalhamento de Extrato SIGEF com Dígito `X` (E.M. João Barbalho)
* **Método:** `GET`
* **URL:** `https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0249/contacorrente/000056267X/cnpj/01226403000116/programa/02/data/082026`

---

## Resumo das 4 Regras de Ouro para Qualquer Ferramenta

1. **Charset:** Configure sempre a decodificação da resposta como `ISO-8859-1` ou `Windows-1252`.
2. **Conta com `X`:** Nunca utilize funções de *apenas números*. Preserve o caractere `X` e aplique padding à esquerda para 10 dígitos.
3. **Mapeamento de Programas:**
   * PDDE Básico: `02`
   * PDDE Qualidade: `0B`
   * PDDE Equidade: `0A`
   * Educação Integral: `Z9`
4. **Classificação Contábil:** Ações identificadas como `BB-APLIC C.PRZ-APL.AUT` e `APLICACAO EM BB FIX` devem ser registradas como **aplicações financeiras em fundo de curto prazo** (Resolução FNDE nº 15/2021), e não como despesas da escola.
