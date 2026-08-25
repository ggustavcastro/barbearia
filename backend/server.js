const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

// ✅ Servindo os arquivos do site (na raiz do repositório)
const pastaPublica = path.join(__dirname, '..');
app.use(express.static(pastaPublica));

// ✅ Conexão com o Banco de Dados
const db = new sqlite3.Database(path.join(__dirname, 'barbearia.db'), (erro) => {
  if (erro) {
    console.error('❌ ERRO ao abrir banco:', erro.message);
  } else {
    console.log('✅ Banco CONECTADO com sucesso!');
    criarTabela();
  }
});

// ✅ Criar tabela se não existir
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

// ✅ Página Inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(pastaPublica, 'index.html'));
});

// ✅ Listar TODOS os agendamentos (formato JSON)
app.get('/api/agendamentos', (req, res) => {
  db.all('SELECT * FROM agendamentos ORDER BY data_criacao DESC', [], (erro, linhas) => {
    if (erro) return res.status(500).json({ erro: erro.message });
    res.json(linhas);
  });
});

// ✅ Visualização em TABELA BONITA
app.get('/tabela-agendamentos', (req, res) => {
  db.all('SELECT * FROM agendamentos ORDER BY data_criacao DESC', [], (erro, linhas) => {
    if (erro) {
      res.send(`<h2>Erro: ${erro.message}</h2>`);
      return;
    }

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

    html += `
      </table>
    </body>
    </html>
    `;

    res.send(html);
  });
});

// ✅ Verificar horários ocupados por data
app.get('/api/horarios-ocupados/:data', (req, res) => {
  const data = req.params.data;
  db.all('SELECT horario FROM agendamentos WHERE data = ?', [data], (erro, linhas) => {
    if (erro) return res.json({ erro: erro.message });
    res.json({ horariosOcupados: linhas.map(l => l.horario) });
  });
});

// ✅ CRIAR AGENDAMENTO com TODAS as validações
app.post('/api/agendamento', (req, res) => {
  const { nome, telefone, servico, servicoValor, data, horario, observacoes } = req.body;

  // Validação de campos obrigatórios
  if (!nome || !telefone || !servico || !data || !horario) {
    return res.json({ sucesso: false, mensagem: 'Preencha todos os campos obrigatórios!' });
  }

  // ✅ VALIDAÇÃO DE TELEFONE — precisa ter 11 dígitos
  const apenasNumeros = telefone.replace(/\D/g, '');
  if (apenasNumeros.length !== 11) {
    return res.json({ 
      sucesso: false, 
      mensagem: '⚠️ O telefone precisa ter 11 dígitos! (DDD + 9 números)\nExemplo: (41) 99999-9999' 
    });
  }

  // Validação de formato de data
  const regexData = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexData.test(data)) {
    return res.json({ sucesso: false, mensagem: 'Formato de data inválido!' });
  }

  // Validação: data não pode ser no passado
  const dataHoje = new Date();
  dataHoje.setHours(0, 0, 0, 0);
  const dataAgendamento = new Date(data + 'T00:00:00');
  if (dataAgendamento < dataHoje) {
    return res.json({ sucesso: false, mensagem: 'Não é possível agendar em datas passadas!' });
  }

  // Validação de formato de horário
  const regexHorario = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!regexHorario.test(horario)) {
    return res.json({ sucesso: false, mensagem: 'Horário inválido! Use HH:MM' });
  }

  // ✅ VALIDAÇÃO DE DIA E HORÁRIO DE ATENDIMENTO
  const diaSemana = dataAgendamento.getDay(); // 0=Domingo, 1=Segunda, 6=Sábado

  // ❌ Domingo = não atende
  if (diaSemana === 0) {
    return res.json({ sucesso: false, mensagem: '❌ Não atendemos aos domingos! Escolha outra data.' });
  }

  // 📅 Sábado = só até 15:00
  if (diaSemana === 6) {
    const [hora, minuto] = horario.split(':').map(Number);
    if (hora > 15 || (hora === 15 && minuto > 0)) {
      return res.json({ sucesso: false, mensagem: '⚠️ Aos sábados atendemos só até às 15:00! Escolha um horário anterior.' });
    }
  }

  // ✅ Verificar se horário JÁ está ocupado
  db.get('SELECT * FROM agendamentos WHERE data = ? AND horario = ?', [data, horario], function(erro, resultado) {
    if (erro) return res.json({ sucesso: false, mensagem: 'Erro ao verificar horário.' });
    if (resultado) return res.json({ sucesso: false, mensagem: `Horário ${horario} JÁ está ocupado! Escolha outro.` });

    // ✅ Salvar no banco
    const sql = `INSERT INTO agendamentos (nome, telefone, servico, servico_valor, data, horario, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const valores = [nome, telefone, servico, servicoValor, data, horario, observacoes || ''];

    db.run(sql, valores, function(erro) {
      if (erro) return res.json({ sucesso: false, mensagem: 'Erro ao salvar agendamento.' });

      // ✅ Mensagem WhatsApp formatada corretamente
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
        mensagem: '✅ Agendamento salvo com sucesso!', 
        id: this.lastID,
        linkWhatsApp: linkWhatsApp
      });
    });
  });
});

// ✅ Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});