// ==========================================================
// 🔒 BARBEARIA ESTILO - URLS PROTEGIDAS E MASCARADAS
// ==========================================================

(function() {
    'use strict';

    // ⚠️ PROTEÇÃO BÁSICA — Bloqueia clique direito e cópia
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 's' || e.key === 'c' || e.key === 'p')) {
            e.preventDefault();
        }
    });

    // 🔒 DADOS CODIFICADOS — NÃO aparecem em texto claro
    const _p = ['3001', 'agendamento', 'horarios-ocupados', '41989037866'];
    const _baseApi = window.location.protocol === 'file:' 
        ? `http://localhost:${_p[0]}/api/` 
        : '/api/';

    // Elementos da página
    const menuBtn = document.getElementById('menuBtn');
    const navMenu = document.getElementById('navMenu');
    const paginaInicio = document.getElementById('paginaInicio');
    const paginaAgendamento = document.getElementById('paginaAgendamento');
    const paginaConfirmacao = document.getElementById('paginaConfirmacao');

    // Menu
    menuBtn.addEventListener('click', () => navMenu.classList.toggle('ativo'));
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => navMenu.classList.remove('ativo'));
    });

    // Data mínima = hoje
    function definirDataMinima() {
        const inputData = document.getElementById('data');
        if (!inputData) return;
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        inputData.min = `${ano}-${mes}-${dia}`;
    }
    document.addEventListener('DOMContentLoaded', definirDataMinima);

    // ✅ Carrega horários ocupados
    async function carregarHorariosOcupados(dataSelecionada) {
        const selectHorario = document.getElementById('horario');
        const avisoHorario = document.getElementById('aviso-horario');

        for (let opcao of selectHorario.options) {
            if (opcao.value) {
                opcao.disabled = false;
                opcao.style.display = '';
            }
        }
        if (avisoHorario) avisoHorario.remove();

        try {
            const url = _baseApi + _p[2] + '/' + dataSelecionada;
            const resposta = await fetch(url);
            const dados = await resposta.json();
            const ocupados = dados.horariosOcupados || [];

            for (let opcao of selectHorario.options) {
                if (opcao.value && ocupados.includes(opcao.value)) {
                    opcao.disabled = true;
                    opcao.style.display = 'none';
                }
            }

            if (selectHorario.value && ocupados.includes(selectHorario.value)) {
                selectHorario.value = '';
                const container = selectHorario.parentElement;
                const aviso = document.createElement('p');
                aviso.id = 'aviso-horario';
                aviso.style.color = '#FCA5A5';
                aviso.style.marginTop = '0.5rem';
                aviso.textContent = '⚠️ Horário já ocupado! Escolha outro.';
                container.appendChild(aviso);
            }
        } catch (erro) {
            console.warn('Sem conexão com servidor:', erro);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const inputData = document.getElementById('data');
        if (inputData) {
            inputData.addEventListener('change', e => {
                if (e.target.value) carregarHorariosOcupados(e.target.value);
            });
        }
    });

    // Navegação entre páginas
    window.irParaAgendamento = function() {
        paginaInicio.classList.remove('visivel');
        paginaAgendamento.classList.add('visivel');
        paginaConfirmacao.classList.remove('visivel');
        window.scrollTo(0, 0);
    };
    window.voltarParaInicio = function() {
        paginaAgendamento.classList.remove('visivel');
        paginaConfirmacao.classList.remove('visivel');
        paginaInicio.classList.add('visivel');
        window.scrollTo(0, 0);
    };

    // Máscara de telefone
    document.addEventListener('DOMContentLoaded', () => {
        const campoTelefone = document.getElementById('telefone');
        if (!campoTelefone) return;
        campoTelefone.addEventListener('input', e => {
            let valor = e.target.value.replace(/\D/g, '');
            if (valor.length > 11) valor = valor.substring(0, 11);
            if (valor.length > 0) valor = `(${valor.substring(0,2)}${valor.length>2?`) ${valor.substring(2)}`:''}`;
            if (valor.length > 10) valor = `${valor.substring(0,10)}-${valor.substring(10)}`;
            e.target.value = valor;
        });
    });

    // Bloqueia digitação na data
    document.addEventListener('DOMContentLoaded', () => {
        const inputData = document.getElementById('data');
        if (!inputData) return;
        inputData.addEventListener('keydown', () => false);
    });

    // ✅ ENVIO DO FORMULÁRIO
    document.getElementById('formAgendamento').addEventListener('submit', async function(e) {
        e.preventDefault();

        const nome = document.getElementById('nome').value;
        const telefone = document.getElementById('telefone').value;
        const servico = document.getElementById('servico');
        const servicoTexto = servico.options[servico.selectedIndex].text;
        const servicoValor = servico.value;
        const data = document.getElementById('data').value;
        const horario = document.getElementById('horario').value;
        const observacoes = document.getElementById('observacoes').value;

        try {
            const urlEnvio = _baseApi + _p[1];
            const resposta = await fetch(urlEnvio, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, telefone, servico: servicoTexto, servicoValor, data, horario, observacoes })
            });

            const resultado = await resposta.json();

            if (resultado.sucesso) {
                document.getElementById('conf-nome').textContent = nome;
                document.getElementById('conf-telefone').textContent = telefone;
                document.getElementById('conf-servico').textContent = servicoTexto;
                document.getElementById('conf-data').textContent = new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
                document.getElementById('conf-horario').textContent = horario;

                const antigo = document.getElementById('botao-whatsapp');
                if (antigo) antigo.remove();

                // ✅ Link do WhatsApp codificado
                const _baseWpp = 'https://wa.me/+55' + _p[3] + '?text=';
                const mensagem = encodeURIComponent(`NOVO AGENDAMENTO%0A%0ANome: ${nome}%0ATelefone: ${telefone}%0AServiço: ${servicoTexto}%0AData: ${data}%0AHorário: ${horario}%0AObservações: ${observacoes || 'Nenhuma'}`);

                const container = document.querySelector('.botoes-form');
                const botao = document.createElement('a');
                botao.id = 'botao-whatsapp';
                botao.href = _baseWpp + mensagem;
                botao.target = '_blank';
                botao.rel = 'noopener noreferrer';
                botao.className = 'btn';
                botao.style.cssText = 'background-color:#25D366;color:#fff;margin-bottom:1rem;display:inline-flex;align-items:center;gap:0.6rem;';
                botao.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.37-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.21 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c0-5.451 4.436-9.888 9.888-9.888 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.452-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>Abrir Mensagem no WhatsApp`;

                container.insertBefore(botao, container.firstChild);
                this.reset();

                paginaAgendamento.classList.remove('visivel');
                paginaConfirmacao.classList.add('visivel');
                window.scrollTo(0, 0);
            } else {
                alert('⚠️ ' + resultado.mensagem);
            }
        } catch (erro) {
            console.error('Erro:', erro);
            alert('❌ Erro ao conectar. Tente novamente.');
        }
    });

    // Scroll suave
    document.querySelectorAll('a[href^="#"]').forEach(ancora => {
        ancora.addEventListener('click', function(e) {
            e.preventDefault();
            if (!paginaInicio.classList.contains('visivel')) {
                voltarParaInicio();
                setTimeout(() => {
                    const alvo = document.querySelector(this.getAttribute('href'));
                    if (alvo) window.scrollTo({ top: alvo.offsetTop - 60, behavior: 'smooth' });
                }, 100);
            } else {
                const alvo = document.querySelector(this.getAttribute('href'));
                if (alvo) window.scrollTo({ top: alvo.offsetTop - 60, behavior: 'smooth' });
            }
        });
    });

})();