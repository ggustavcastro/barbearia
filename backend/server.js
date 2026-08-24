const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// 🗄️ Conectar ao SQLite
const db = new sqlite3.Database('./barbearia.db', (erro) => {
  if (erro) {
    console.error('❌ ERRO ao abrir banco:', erro.message);
  } else {
    console.log('✅ Banco CONECTADO com sucesso!');
    criarTabela();
  }
});

// 📋 Criar tabela
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
    if (erro) {
      console.error('❌ Erro ao criar tabela:', erro.message);
    } else {
      console.log('✅ Tabela PRONTA!');
    }
  });
}

// 📋 Listar agendamentos
app.get('/api/agendamentos', (req, res) => {
  db.all('SELECT * FROM agendamentos ORDER BY data_criacao DESC', [], (erro, linhas) => {
    if (erro) {
      console.error('❌ Erro ao listar:', erro.message);
      return res.status(500).json({ erro: erro.message });
    }
    res.json(linhas);
  });
});

// ⏰ Horários ocupados por data
app.get('/api/horarios-ocupados/:data', (req, res) => {
  const data = req.params.data;
  db.all('SELECT horario FROM agendamentos WHERE data = ?', [data], (erro, linhas) => {
    if (erro) return res.json({ erro: erro.message });
    const horariosOcupados = linhas.map(item => item.horario);
    res.json({ horariosOcupados });
  });
});

// =============================================
// 📥 SALVAR AGENDAMENTO — COM VALIDAÇÕES ✅
// =============================================
app.post('/api/agendamento', (req, res) => {
  const { nome, telefone, servico, servicoValor, data, horario, observacoes } = req.body;

  console.log('📥 Dados recebidos:', req.body);

  // =============================================
  // ✅ VALIDAÇÃO 1 — Campos obrigatórios
  // =============================================
  if (!nome || !telefone || !servico || !data || !horario) {
    return res.json({
      sucesso: false,
      mensagem: 'Preencha todos os campos obrigatórios!'
    });
  }

  // =============================================
  // ✅ VALIDAÇÃO 2 — Formato da Data (AAAA-MM-DD)
  // =============================================
  const regexData = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexData.test(data)) {
    return res.json({
      sucesso: false,
      mensagem: 'Formato de data inválido! Use: AAAA-MM-DD (ex: 2026-08-25)'
    });
  }

  // =============================================
  // ✅ VALIDAÇÃO 3 — Data igual ou posterior a hoje
  // =============================================
  const dataAtual = new Date();
  dataAtual.setHours(0, 0, 0, 0); // Zera a hora para comparar só a data

  const dataAgendamento = new Date(data + 'T00:00:00');

  if (dataAgendamento < dataAtual) {
    return res.json({
      sucesso: false,
      mensagem: 'A data deve ser HOJE ou uma data FUTURA! Não pode agendar para datas passadas.'
    });
  }

  // =============================================
  // ✅ VALIDAÇÃO 4 — Formato do Horário EXATO (HH:MM)
  // =============================================
  const regexHorario = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!regexHorario.test(horario)) {
    return res.json({
      sucesso: false,
      mensagem: 'Formato de horário inválido! Use exatamente HH:MM (ex: 10:00, 14:30)'
    });
  }

  // =============================================
  // ✅ VALIDAÇÃO 5 — Verificar se horário JÁ ESTÁ OCUPADO naquela data
  // =============================================
  db.get(
    'SELECT * FROM agendamentos WHERE data = ? AND horario = ?',
    [data, horario],
    function(erro, resultado) {
      if (erro) {
        console.error('❌ Erro ao verificar horário:', erro.message);
        return res.json({ sucesso: false, mensagem: 'Erro ao verificar disponibilidade.' });
      }

      // ⛔ Horário já existe!
      if (resultado) {
        return res.json({
          sucesso: false,
          mensagem: `O horário ${horario} do dia ${data} JÁ ESTÁ MARCADO! Escolha outro horário.`
        });
      }

      // ✅ Horário DISPONÍVEL! Pode salvar!
      const sql = `INSERT INTO agendamentos (nome, telefone, servico, servico_valor, data, horario, observacoes)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const valores = [nome, telefone, servico, servicoValor, data, horario, observacoes || ''];

      db.run(sql, valores, function(erro) {
        if (erro) {
          console.error('❌ Erro ao salvar:', erro.message);
          return res.json({ sucesso: false, mensagem: 'Erro ao salvar agendamento.' });
        }

        // Gerar link do WhatsApp
        const mensagem = `NOVO AGENDAMENTO%0A%0ANome: ${nome}%0ATelefone: ${telefone}%0AServiço: ${servico}%0AData: ${data}%0AHorário: ${horario}%0AObservações: ${observacoes || 'Nenhuma'}`;
        const linkWhatsApp = `https://wa.me/+5541989037866?text=${mensagem}`;

        console.log(`✅ SUCESSO! Agendamento #${this.lastID} SALVO!`);

        res.json({
          sucesso: true,
          mensagem: '✅ Agendamento salvo com sucesso!',
          id: this.lastID,
          linkWhatsApp
        });
      });
    }
  );
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📋 Listar: http://localhost:${PORT}/api/agendamentos`);
  console.log(`🛡️ Validações ativas: Data futura + Horário único + Formato exato`);
});

// 1. CRIAR AGENDAMENTO (POST)
// 📋 Dados para colocar no Postman:
// Método: POST
// URL: http://localhost:3001/api/agendamento
// Aba Body → raw → JSON ✅
// json
// {
//   "nome": "João da Silva",
//   "telefone": "(41) 98903-7866",
//   "servico": "Corte + Barba",
//   "servicoValor": "corte-barba",
//   "data": "2026-08-25",
//   "horario": "10:00",
//   "observacoes": "Degradê na lateral"
// }
// ⌨️ Comando CURL equivalente (copiar e colar direto):
// bash
// curl -X POST "http://localhost:3001/api/agendamento" \
// -H "Content-Type: application/json" \
// -d '{
//   "nome": "João da Silva",
//   "telefone": "(41) 98903-7866",
//   "servico": "Corte + Barba",
//   "servicoValor": "corte-barba",
//   "data": "2026-08-25",
//   "horario": "10:00",
//   "observacoes": "Degradê na lateral"
// }'
// 📥 2. LISTAR TODOS OS AGENDAMENTOS (GET)
// 📋 No Postman:
// Método: GET
// URL: http://localhost:3001/api/agendamentos
// ⌨️ CURL:
// bash
// curl -X GET "http://localhost:3001/api/agendamentos"
// ⏰ 3. CONSULTAR HORÁRIOS OCUPADOS POR DATA (GET)
// 📋 No Postman:
// Método: GET
// URL: http://localhost:3001/api/horarios-ocupados/2026-08-25
// ⚠️ Troque a data no final pelo formato ANO-MÊS-DIA → AAAA-MM-DD
// ⌨️ CURL:
// bash
// curl -X GET "http://localhost:3001/api/horarios-ocupados/2026-08-25"