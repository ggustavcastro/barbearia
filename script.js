// Menu responsivo
const menuBtn = document.getElementById('menuBtn');
const navMenu = document.getElementById('navMenu');

menuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('ativo');
});

// Fechar menu ao clicar em um link
const links = navMenu.querySelectorAll('a');
links.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('ativo');
    });
});

// NAVEGAÇÃO ENTRE PÁGINAS
const paginaInicio = document.getElementById('paginaInicio');
const paginaAgendamento = document.getElementById('paginaAgendamento');
const paginaConfirmacao = document.getElementById('paginaConfirmacao');

// ✅ Regra: Data mínima = HOJE (não deixa escolher datas passadas)
function definirDataMinima() {
  const inputData = document.getElementById('data');
  if (!inputData) return;

  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const dataMinima = `${ano}-${mes}-${dia}`;

  inputData.min = dataMinima; // ✅ Bloqueia todos os dias anteriores
}

// Executa automaticamente quando a página carrega
document.addEventListener('DOMContentLoaded', definirDataMinima);

function irParaAgendamento() {
    paginaInicio.classList.remove('visivel');
    paginaAgendamento.classList.add('visivel');
    paginaConfirmacao.classList.remove('visivel');
    window.scrollTo(0, 0);
}

function voltarParaInicio() {
    paginaAgendamento.classList.remove('visivel');
    paginaConfirmacao.classList.remove('visivel');
    paginaInicio.classList.add('visivel');
    window.scrollTo(0, 0);
}

function irParaConfirmacao() {
    paginaAgendamento.classList.remove('visivel');
    paginaConfirmacao.classList.add('visivel');
    window.scrollTo(0, 0);
}

// ✅ ENVIO DO FORMULÁRIO PARA O BACK-END — CORRIGIDO
document.getElementById('formAgendamento').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Pegar os dados do formulário
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const servico = document.getElementById('servico');
    const servicoTexto = servico.options[servico.selectedIndex].text;
    const servicoValor = servico.value;
    const data = document.getElementById('data').value;
    const horario = document.getElementById('horario').value;
    const observacoes = document.getElementById('observacoes').value;

    try {
        // ✅ PORTA CORRIGIDA para 3000
        const resposta = await fetch('http://localhost:3001/api/agendamento', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome,
                telefone,
                servico: servicoTexto,
                servicoValor: servicoValor,
                data,
                horario,
                observacoes
            })
        });

        const resultado = await resposta.json();

        if (resultado.sucesso) {
  document.getElementById('conf-nome').textContent = nome;
  document.getElementById('conf-telefone').textContent = telefone;
  document.getElementById('conf-servico').textContent = servicoTexto;
  document.getElementById('conf-data').textContent = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
  document.getElementById('conf-horario').textContent = horario;

  // ✅ REMOVER botão antigo (se existir)
  const botaoAntigo = document.getElementById('botao-whatsapp');
  if (botaoAntigo) botaoAntigo.remove();

  // ✅ CRIAR botão NOVO sempre
  const containerBotoes = document.querySelector('.botoes-form');
  const botaoWhatsApp = document.createElement('a');
  botaoWhatsApp.id = 'botao-whatsapp'; // Identificador para não duplicar
  botaoWhatsApp.href = resultado.linkWhatsApp;
  botaoWhatsApp.target = '_blank';
  botaoWhatsApp.className = 'btn';
  botaoWhatsApp.style.backgroundColor = '#25D366';
  botaoWhatsApp.style.color = '#fff';
  botaoWhatsApp.style.marginBottom = '1rem';
  botaoWhatsApp.textContent = '💬 Abrir Mensagem no WhatsApp';

  // ✅ Adicionar no topo dos botões
  containerBotoes.insertBefore(botaoWhatsApp, containerBotoes.firstChild);

  this.reset();
  irParaConfirmacao();
} else {
            alert('⚠️ ' + resultado.mensagem);
        }

    } catch (erro) {
        console.error('Erro:', erro);
        alert('❌ Erro ao conectar com o servidor. Tente novamente mais tarde.');
    }
});

// Scroll suave
document.querySelectorAll('a[href^="#"]').forEach(ancora => {
    ancora.addEventListener('click', function (e) {
        e.preventDefault();
        if (!paginaInicio.classList.contains('visivel')) {
            voltarParaInicio();
            setTimeout(() => {
                const alvo = document.querySelector(this.getAttribute('href'));
                if (alvo) {
                    window.scrollTo({
                        top: alvo.offsetTop - 60,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        } else {
            const alvo = document.querySelector(this.getAttribute('href'));
            if (alvo) {
                window.scrollTo({
                    top: alvo.offsetTop - 60,
                    behavior: 'smooth'
                });
            }
        }
    });
});
// // ✅ BLOQUEIA TOTALMENTE A DIGITAÇÃO DO CAMPO DATA
// document.addEventListener('DOMContentLoaded', () => {
//   const inputData = document.getElementById('data');
//   if (!inputData) return;

//   // 🔒 Bloqueia qualquer tecla
//   inputData.addEventListener('keydown', (e) => {
//     e.preventDefault();
//     return false;
//   });

//   // 🔒 Bloqueia colar
//   inputData.addEventListener('paste', (e) => {
//     e.preventDefault();
//     return false;
//   });

//   // 🔒 Bloqueia entrada de caracteres
//   inputData.addEventListener('input', (e) => {
//     const valorOriginal = inputData.value;
//     setTimeout(() => {
//       if (inputData.value !== valorOriginal) {
//         inputData.value = valorOriginal;
//       }
//     }, 10);
//   });

//   // ✅ Define data mínima = HOJE
//   const hoje = new Date();
//   const ano = hoje.getFullYear();
//   const mes = String(hoje.getMonth() + 1).padStart(2, '0');
//   const dia = String(hoje.getDate()).padStart(2, '0');
//   inputData.min = `${ano}-${mes}-${dia}`;
// });
// document.addEventListener('DOMContentLoaded', () => {
//   const inputData = document.getElementById('data');
//   if (!inputData) return;

//   // ✅ Define data mínima = HOJE
//   const hoje = new Date();
//   const ano = hoje.getFullYear();
//   const mes = String(hoje.getMonth() + 1).padStart(2, '0');
//   const dia = String(hoje.getDate()).padStart(2, '0');
//   inputData.min = `${ano}-${mes}-${dia}`;
// });
document.addEventListener('DOMContentLoaded', () => {
  const inputData = document.getElementById('data');
  if (!inputData) return;

  // ✅ Bloqueia digitação por segurança extra
  inputData.addEventListener('keydown', () => false);

  // ✅ Define data mínima = HOJE
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  inputData.min = `${ano}-${mes}-${dia}`;
});
// ✅ MÁSCARA DE TELEFONE — Formata automaticamente e limita caracteres
document.addEventListener('DOMContentLoaded', () => {
  const campoTelefone = document.getElementById('telefone');
  if (!campoTelefone) return;

  campoTelefone.addEventListener('input', function(e) {
    let valor = e.target.value.replace(/\D/g, ''); // ✅ Só deixa NÚMEROS

    if (valor.length > 11) valor = valor.substring(0, 11); // ✅ Limita em 11 dígitos

    // ✅ Aplica formatação enquanto digita
    if (valor.length > 0) valor = `(${valor.substring(0, 2)}${valor.length > 2 ? `) ${valor.substring(2)}` : ''}`;
    if (valor.length > 10) valor = `${valor.substring(0, 10)}-${valor.substring(10)}`;

    e.target.value = valor;
  });
});
// ✅ ABRIR E FECHAR MENU DAS REDES SOCIAIS
document.addEventListener('DOMContentLoaded', () => {
  const botao = document.getElementById('botaoRedes');
  const menu = document.getElementById('menuRedes');

  if (!botao || !menu) return;

  botao.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('aberto');
  });

  // Fecha o menu se clicar fora dele
  document.addEventListener('click', () => {
    menu.classList.remove('aberto');
  });

  // Impede de fechar quando clicar dentro do menu
  menu.addEventListener('click', (e) => {
    e.stopPropagation();
  });
});