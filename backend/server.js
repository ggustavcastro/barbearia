const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

// ✅ Servindo os arquivos do site
const pastaPublica = path.join(__dirname, '..');
app.use(express.static(pastaPublica));

// ✅ CONEXÃO COM POSTGRESQL PERMANENTE
const db = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORTA || 5432,
  database: process.env.DB_NOME,
  user: process.env.DB_USUARIO,
  password: process.env.DB_SENHA,
  ssl: { rejectUnauthorized: false }
});

// ✅ Conectar e criar tabela
db.connect((erro) => {
  if (erro) {
    console.error('❌ ERRO ao conectar no banco:', erro.message);
  } else {
    console.log('✅ Banco POSTGRESQL CONECTADO! Dados NÃO somem mais! 🔒');
    criarTabela();
  }
});

function criarTabela() {
  const sql = `
    CREATE TABLE IF NOT EXISTS agendamentos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      telefone VARCHAR(30) NOT NULL,
      servico VARCHAR(100) NOT NULL,
      servico_valor VARCHAR(20),
      data DATE NOT NULL,
      horario VARCHAR(10) NOT NULL,
      observacoes TEXT,
      data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  db.query(sql, (erro) => {
    if (erro) console.error('❌ Erro ao criar tabela:', erro.message);
    else console.log('✅ Tabela PRONTA! Agendamentos salvos para sempre! 🎉');
  });
}

// ✅ Página Inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(pastaPublica, 'index.html'));
});

// ✅ Listar TODOS os agendamentos
app.get('/api/agendamentos', (req, res) => {
  db.query('SELECT * FROM agendamentos ORDER BY data_criacao DESC', (erro, resultado) => {
    if (erro) return res.status(500).json({ erro: erro.message });
    res.json(resultado.rows);
  });
});

// ✅ Visualização em TABELA BONITA
app.get('/tabela-agendamentos', (req, res) => {
  db.query('SELECT * FROM agendamentos ORDER BY data_criacao DESC', (erro, resultado) => {
    if (erro) return res.send(`<h2>Erro: ${erro.message}</h2>`);
    const linhas = resultado.rows;

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>📋 Agendamentos - Barbearia Estilo</title>
      <style>
        * { font-family: Arial, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #f0f2f5; padding: 20px; }
        h1 { text-align: center; color: #1a1a2e; margin-bottom: 25px; }
        .info { text-align: center; margin-bottom: 15px; color: #555; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        th { background: #1a1a2e; color: #ffd700; padding: 12px 8px; text-align: left; font-size: 14px; }
        td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 14px; color: #333; }
        tr:hover { background: #f8f9fa; }
        .vazio { text-align: center; padding: 40px; color: #888; font-size: 16px; }
        @media(max-width: 768px) { th, td { padding: 8px 4px; font-size: 11px; } }
      </style>
    </head>
    <body>
      <h1>📋 Agendamentos Salvos no Banco</h1>
      <p class="info">Total: ${linhas.length} agendamento(s)</p>
      <table>
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>Telefone</th>
          <th>Serviço</th>
          <th>Data</th>
          <th>Horário</th>
          <th>Obs</th>
          <th>Data/Hora</th>
        </tr>
    `;

    if (linhas.length === 0) {
      html += `<tr><td colspan="8" class="vazio">📭 Nenhum agendamento salvo ainda!</td></tr>`;
    } else {
      linhas.forEach(l => {
        html += `
        <tr>
          <td>${l.id}</td>
          <td>${l.nome}</td>
          <td>${l.telefone}</td>
          <td>${l.servico}</td>
          <td>${l.data}</td>
          <td>${l.horario}</td>
          <td>${l.observacoes || '-'}</td>
          <td>${l.data_criacao || '-'}</td>
        </tr>`;
      });
    }

    html += `</table></body></html>`;
    res.send(html);
  });
});

// ✅ Verificar horários ocupados por data
app.get('/api/horarios-ocupados/:data', (req, res) => {
  const data = req.params.data;
  db.query('SELECT horario FROM agendamentos WHERE data = $1', [data], (erro, resultado) => {
    if (erro) return res.json({ erro: erro.message });
    res.json({ horariosOcupados: resultado.rows.map(l => l.horario) });
  });
});

// ✅ CRIAR AGENDAMENTO com TODAS as validações
app.post('/api/agendamento', (req, res) => {
  const { nome, telefone, servico, servicoValor, data, horario, observacoes } = req.body;

  if (!nome || !telefone || !servico || !data || !horario) {
    return res.json({ sucesso: false, mensagem: 'Preencha todos os campos obrigatórios!' });
  }

  // ✅ VALIDAÇÃO DE TELEFONE — 11 dígitos
  const apenasNumeros = telefone.replace(/\D/g, '');
  if (apenasNumeros.length !== 11) {
    return res.json({ 
      sucesso: false, 
      mensagem: '⚠️ O telefone precisa ter 11 dígitos! (DDD + 9 números)\nExemplo: (41) 99999-9999' 
    });
  }

  const regexData = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexData.test(data)) {
    return res.json({ sucesso: false, mensagem: 'Formato de data inválido!' });
  }

  const dataHoje = new Date();
  dataHoje.setHours(0, 0, 0, 0);
  const dataAgendamento = new Date(data + 'T00:00:00');
  if (dataAgendamento < dataHoje) {
    return res.json({ sucesso: false, mensagem: 'Não é possível agendar em datas passadas!' });
  }

  const regexHorario = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!regexHorario.test(horario)) {
    return res.json({ sucesso: false, mensagem: 'Horário inválido! Use HH:MM' });
  }

  // ✅ VALIDAÇÃO DE DIA
  const diaSemana = dataAgendamento.getDay();
  if (diaSemana === 0) {
    return res.json({ sucesso: false, mensagem: '❌ Não atendemos aos domingos! Escolha outra data.' });
  }
  if (diaSemana === 6) {
    const [hora, minuto] = horario.split(':').map(Number);
    if (hora > 15 || (hora === 15 && minuto > 0)) {
      return res.json({ sucesso: false, mensagem: '⚠️ Aos sábados atendemos só até às 15:00! Escolha um horário anterior.' });
    }
  }

  // ✅ Verificar se horário está ocupado
  db.query('SELECT * FROM agendamentos WHERE data = $1 AND horario = $2', [data, horario], (erro, resultado) => {
    if (erro) return res.json({ sucesso: false, mensagem: 'Erro ao verificar horário.' });
    if (resultado.rows.length > 0) {
      return res.json({ sucesso: false, mensagem: `Horário ${horario} JÁ está ocupado! Escolha outro.` });
    }

    // ✅ Salvar no banco PERMANENTE
    const sql = `INSERT INTO agendamentos (nome, telefone, servico, servico_valor, data, horario, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
    const valores = [nome, telefone, servico, servicoValor, data, horario, observacoes || ''];

    db.query(sql, valores, (erro, resultado) => {
      if (erro) return res.json({ sucesso: false, mensagem: 'Erro ao salvar agendamento.' });

      // ✅ Mensagem WhatsApp formatada
      const mensagem = `NOVO AGENDAMENTO

Nome: ${nome}
Telefone: ${telefone}
Serviço: ${servico}
Data: ${data}
Horário: ${horario}
Observações: ${observacoes || 'Nenhuma'}`;

      const linkWhatsApp = `https://wa.me/+5541989037866?text=${encodeURIComponent(mensagem)}`;

      res.json({ 
        sucesso: true, 
        mensagem: '✅ Agendamento SALVO PARA SEMPRE! 🔒', 
        id: resultado.rows[0].id,
        linkWhatsApp: linkWhatsApp
      });
    });
  });
});

// ✅ Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});