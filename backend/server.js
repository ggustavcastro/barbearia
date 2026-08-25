const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: true }));
app.use(express.json());

// ✅ Caminho correto para a pasta public
const pastaPublica = path.join(__dirname, '..', 'public');
app.use(express.static(pastaPublica));

// ✅ CONEXÃO — NOMES EXATOS que estão no Render!
const db = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORTA || 5432,
  database: process.env.DB_NOME,
  user: process.env.DB_USUARIO,
  password: process.env.DB_SENHA,
  ssl: { rejectUnauthorized: false }
});

// ✅ Formatar DATA — SEM ALTERAR O DIA que o usuário escolheu!
function formatarDataISO(data) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data;
  }
  const d = new Date(data);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// ✅ Formatar DATA e HORA — HORÁRIO DO BRASIL (sem UTC!)
function formatarDataHoraISO(data) {
  const d = new Date(data);
  // ✅ Pega direto no horário local do servidor (Brasil)
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const seg = String(d.getSeconds()).padStart(2, '0');
  return `${ano}-${mes}-${dia} ${hora}:${min}:${seg}`;
}

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
      observacoes VARCHAR(100),
      data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  db.query(sql, (erro) => {
    if (erro) console.error('❌ Erro ao criar tabela:', erro.message);
    else console.log('✅ Tabela PRONTA! 🎉');
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

// ✅ EXCLUIR agendamento por ID
app.delete('/api/agendamento/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM agendamentos WHERE id = $1', [id], (erro, resultado) => {
    if (erro) return res.json({ sucesso: false, mensagem: 'Erro ao excluir!' });
    if (resultado.rowCount === 0) {
      return res.json({ sucesso: false, mensagem: 'Nenhum agendamento encontrado com esse ID!' });
    }
    res.json({ sucesso: true, mensagem: `✅ Agendamento ID ${id} EXCLUÍDO com sucesso!` });
  });
});

// ✅ TABELA com BOTÃO EXCLUIR — HORA CORRIGIDA!
app.get('/tabela-agendamentos', (req, res) => {
  db.query('SELECT * FROM agendamentos ORDER BY id DESC', (erro, resultado) => {
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
    .excluir { background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 13px; }
    .excluir:hover { background: #c0392b; }
    @media(max-width: 768px) { th, td { padding: 8px 4px; font-size: 11px; } .excluir { padding: 4px 8px; font-size: 11px; } }
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
      <th>Ação</th>
    </tr>`;

    if (linhas.length === 0) {
      html += `<tr><td colspan="9" class="vazio">📭 Nenhum agendamento salvo ainda!</td></tr>`;
    } else {
      linhas.forEach(l => {
        html += `
        <tr>
          <td>${l.id}</td>
          <td>${l.nome}</td>
          <td>${l.telefone}</td>
          <td>${l.servico}</td>
          <td>${formatarDataISO(l.data)}</td>
          <td>${l.horario}</td>
          <td>${l.observacoes || '-'}</td>
          <td>${formatarDataHoraISO(l.data_criacao)}</td>
          <td><button class="excluir" onclick="excluir(${l.id})">Excluir</button></td>
        </tr>`;
      });
    }

    html += `
  </table>
  <script>
    async function excluir(id) {
      if (confirm('⚠️ Tem certeza que deseja EXCLUIR o agendamento ID ' + id + '?')) {
        const res = await fetch('/api/agendamento/' + id, { method: 'DELETE' });
        const dados = await res.json();
        alert(dados.mensagem);
        if (dados.sucesso) location.reload();
      }
    }
  </script>
</body>
</html>`;
    res.send(html);
  });
});

// ✅ Verificar horários ocupados
app.get('/api/horarios-ocupados/:data', (req, res) => {
  const data = req.params.data;
  db.query('SELECT horario FROM agendamentos WHERE data = $1', [data], (erro, resultado) => {
    if (erro) return res.json({ erro: erro.message });
    res.json({ horariosOcupados: resultado.rows.map(l => l.horario) });
  });
});

// ✅ CRIAR agendamento — DATA e HORA CORRETAS!
app.post('/api/agendamento', (req, res) => {
  const { nome, telefone, servico, servicoValor, data, horario, observacoes } = req.body;

  if (!nome || !telefone || !servico || !data || !horario) {
    return res.json({ sucesso: false, mensagem: 'Preencha todos os campos obrigatórios!' });
  }

  // ✅ Validar telefone (11 dígitos)
  const apenasNumeros = telefone.replace(/\D/g, '');
  if (apenasNumeros.length !== 11) {
    return res.json({ sucesso: false, mensagem: '⚠️ Telefone precisa ter 11 dígitos!' });
  }

  // ✅ Validar limite de 100 caracteres nas observações
  if (observacoes && observacoes.length > 100) {
    return res.json({ sucesso: false, mensagem: `⚠️ Observações muito longas! Máximo de 100 caracteres (você digitou ${observacoes.length}).` });
  }

  // ✅ Validar formato da data
  const regexData = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexData.test(data)) {
    return res.json({ sucesso: false, mensagem: 'Formato de data inválido!' });
  }

  // ✅ Validar horário de atendimento
  const dataAgendamento = new Date(data + 'T00:00:00');
  const diaSemana = dataAgendamento.getDay();
  const horaAgendamento = parseInt(horario.split(':')[0]);

  if (diaSemana === 0) {
    return res.json({ sucesso: false, mensagem: '❌ Não atendemos aos domingos!' });
  }
  if (diaSemana === 6 && horaAgendamento >= 15) {
    return res.json({ sucesso: false, mensagem: '⚠️ Sábado atendemos só até às 15:00!' });
  }

  // ✅ Verificar se horário já está ocupado
  db.query('SELECT * FROM agendamentos WHERE data = $1 AND horario = $2', [data, horario], (erro, resultado) => {
    if (erro) return res.json({ sucesso: false, mensagem: 'Erro ao verificar horário.' });
    if (resultado.rows.length > 0) {
      return res.json({ sucesso: false, mensagem: `Horário ${horario} JÁ está ocupado! Escolha outro.` });
    }

    // ✅ Garantir que observações não passe de 100 caracteres
    const obsSalvar = observacoes ? observacoes.substring(0, 100) : 'Nenhuma';

    // ✅ Salvar no banco — DATA EXATA que o usuário escolheu!
    const sql = `INSERT INTO agendamentos (nome, telefone, servico, servico_valor, data, horario, observacoes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
    const valores = [nome, telefone, servico, servicoValor, data, horario, obsSalvar];

    db.query(sql, valores, (erro, resultado) => {
      if (erro) return res.json({ sucesso: false, mensagem: 'Erro ao salvar agendamento.' });

      const mensagemWhatsApp = `NOVO AGENDAMENTO

Nome: ${nome}
Telefone: ${telefone}
Serviço: ${servico}
Data: ${formatarDataISO(data)}
Horário: ${horario}
Observações: ${obsSalvar}`;

      res.json({
        sucesso: true,
        mensagem: '✅ Agendamento SALVO PARA SEMPRE! 🔒',
        id: resultado.rows[0].id,
        mensagemWhatsApp: encodeURIComponent(mensagemWhatsApp)
      });
    });
  });
});

// ✅ Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});