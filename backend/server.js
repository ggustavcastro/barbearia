const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

// ✅ Servindo os arquivos do site que está FORA da pasta backend
const pastaPublica = path.join(__dirname, '..', 'public');
app.use(express.static(pastaPublica));

// Banco de Dados
const db = new sqlite3.Database(path.join(__dirname, 'barbearia.db'), (erro) => {
  if (erro) {
    console.error('❌ ERRO ao abrir banco:', erro.message);
  } else {
    console.log('✅ Banco CONECTADO com sucesso!');
    criarTabela();
  }
});

function criarTabela() {
  db.run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      servico TEXT NOT NULL,
      servico_valor TEXT,
      data DATE NOT NULL,
      horario TEXT NOT NULL,
      observacoes TEXT,
      data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `, (erro) => {
    if (erro) console.error('❌ Erro ao criar tabela:', erro.message);
    else console.log('✅ Tabela PRONTA!');
  });
}

// ✅ ROTAS DA API
app.get('/api/agendamentos', (req, res) => {
  db.all('SELECT * FROM agendamentos ORDER BY data_criacao DESC', [], (erro, linhas) => {
    if (erro) return res.status(500).json({ erro: erro.message });
    res.json(linhas);
  });
});

app.get('/api/horarios-ocupados/:data', (req, res) => {
  const data = req.params.data;
  db.all('SELECT horario FROM agendamentos WHERE data = ?', [data], (erro, linhas) => {
    if (erro) return res.json({ erro: erro.message });
    res.json({ horariosOcupados: linhas.map(i => i.horario) });
  });
});

app.post('/api/agendamento', (req, res) => {
  const { nome, telefone, servico, servicoValor, data, horario, observacoes } = req.body;

  if (!nome || !telefone || !servico || !data || !horario) {
    return res.json({ sucesso: false, mensagem: 'Preencha todos os campos obrigatórios!' });
  }

  const regexData = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexData.test(data)) {
    return res.json({ sucesso: false, mensagem: 'Formato de data inválido!' });
  }

  const dataAtual = new Date();
  dataAtual.setHours(0, 0, 0, 0);
  const dataAgendamento = new Date(data + 'T00:00:00');
  if (dataAgendamento < dataAtual) {
    return res.json({ sucesso: false, mensagem: 'Data deve ser hoje ou futura!' });
  }

  const regexHorario = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!regexHorario.test(horario)) {
    return res.json({ sucesso: false, mensagem: 'Horário inválido! Use HH:MM' });
  }

  db.get('SELECT * FROM agendamentos WHERE data = ? AND horario = ?', [data, horario], function(erro, resultado) {
    if (erro) return res.json({ sucesso: false, mensagem: 'Erro ao verificar horário.' });
    if (resultado) return res.json({ sucesso: false, mensagem: `Horário ${horario} já está ocupado! Escolha outro.` });

    const sql = `INSERT INTO agendamentos (nome, telefone, servico, servico_valor, data, horario, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const valores = [nome, telefone, servico, servicoValor, data, horario, observacoes || ''];

    db.run(sql, valores, function(erro) {
      if (erro) return res.json({ sucesso: false, mensagem: 'Erro ao salvar agendamento.' });

      const mensagemWpp = encodeURIComponent(`NOVO AGENDAMENTO%0A%0ANome: ${nome}%0ATelefone: ${telefone}%0AServiço: ${servico}%0AData: ${data}%0AHorário: ${horario}%0AObservações: ${observacoes || 'Nenhuma'}`);
      const linkWhatsApp = `https://wa.me/+5541989037866?text=${mensagemWpp}`;

      res.json({ sucesso: true, mensagem: '✅ Agendamento salvo com sucesso!', id: this.lastID, linkWhatsApp });
    });
  });
});

// ✅ Abrir a página inicial do site
app.get('/', (req, res) => {
  res.sendFile(path.join(pastaPublica, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});