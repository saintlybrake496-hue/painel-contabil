const firebaseConfig = {
    apiKey: "AIzaSyBsN6g6RuUgY9oQXxkuVsn2ckn2hfbZzL8",
    authDomain: "meu-painel-contabil.firebaseapp.com",
    databaseURL: "https://meu-painel-contabil-default-rtdb.firebaseio.com",
    projectId: "meu-painel-contabil",
    storageBucket: "meu-painel-contabil.firebasestorage.app",
    messagingSenderId: "369217483068",
    appId: "1:369217483068:web:4cfabe07fb3e1bade52e39"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

const refAtivas = database.ref('obr_ativas');
const refConcluidas = database.ref('obr_concluidas');
let cacheDadosAtivos = {}; 
let cacheDadosConcluidos = {}; // Adicionado cache para histórico
let meuGrafico = null; // Instância do gráfico

// --- LOGIN ---
auth.onAuthStateChanged(user => {
    const loginTela = document.getElementById('tela-login');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main-content');
    const ticker = document.getElementById('footer-ticker');
    const graf = document.getElementById('container-grafico'); // Novo
    if (user) {
        loginTela.style.display = 'none';
        sidebar.style.display = 'block';
        main.style.display = 'block';
        ticker.style.display = 'flex';
        graf.style.display = 'block'; // Novo
        inicializarGrafico(); // Inicializa quando loga
    } else {
        loginTela.style.display = 'flex';
        sidebar.style.display = 'none';
        main.style.display = 'none';
        ticker.style.display = 'none';
        graf.style.display = 'none'; // Novo
    }
});

function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    auth.signInWithEmailAndPassword(email, senha).catch(err => alert("Erro: " + err.message));
}

function fazerLogout() { auth.signOut(); }

// --- NAVEGAÇÃO ---
function mostrarTela(idTela) {
    document.querySelectorAll('.tela-section').forEach(tela => tela.classList.remove('ativo'));
    document.getElementById(idTela).classList.add('ativo');
}

// --- ESCUTAS FIREBASE ---
refAtivas.on('value', (snapshot) => {
    cacheDadosAtivos = snapshot.val() || {};
    renderizarPainel(cacheDadosAtivos);
    atualizarGrafico(); // Atualiza gráfico ao mudar pendentes
});

refConcluidas.on('value', (snapshot) => {
    cacheDadosConcluidos = snapshot.val() || {};
    renderizarConsulta(cacheDadosConcluidos);
    renderizarEstorno(cacheDadosConcluidos);
    renderizarTicker(cacheDadosConcluidos);
    atualizarGrafico(); // Atualiza gráfico ao mudar concluídas
});

// --- FUNÇÃO DO GRÁFICO (NOVO) ---
function inicializarGrafico() {
    const ctx = document.getElementById('graficoStatus').getContext('2d');
    if (meuGrafico) meuGrafico.destroy();
    meuGrafico = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendentes', 'Concluídas'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#ff4d4d', '#00ff88'],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function atualizarGrafico() {
    if (!meuGrafico) return;
    const pendentes = Object.keys(cacheDadosAtivos).length;
    const concluidas = Object.keys(cacheDadosConcluidos).length;
    meuGrafico.data.datasets[0].data = [pendentes, concluidas];
    meuGrafico.update();
}

// --- FUNÇÕES CRUD ---

function adicionarObrigacao() {
    const editId = document.getElementById('edit-id').value;
    const empresa = document.getElementById('empresa').value.toUpperCase();
    const titulo = document.getElementById('titulo').value.toUpperCase();
    const vencimento = document.getElementById('dataVencimento').value;
    const dataEmail = document.getElementById('dataEmail').value;

    if (!empresa || !titulo || !vencimento) return alert("Preencha os campos obrigatórios!");

    const id = editId || Date.now().toString();
    refAtivas.child(id).set({ id, empresa, titulo, vencimento, dataEmail }).then(() => {
        cancelarEdicao();
        mostrarTela('tela-painel');
    });
}

function deletarObrigacao(id) {
    if(confirm("Excluir esta obrigação do painel?")) refAtivas.child(id).remove();
}

function deletarHistorico(id) {
    if(confirm("Excluir este registro permanentemente do histórico?")) {
        refConcluidas.child(id).remove();
    }
}

function prepararEdicao(id, empresa, titulo, vencimento, dataEmail) {
    mostrarTela('tela-cadastro');
    document.getElementById('titulo-cadastro').innerText = "EDITAR OBRIGAÇÃO";
    document.getElementById('edit-id').value = id;
    document.getElementById('empresa').value = empresa;
    document.getElementById('titulo').value = titulo;
    document.getElementById('dataVencimento').value = vencimento;
    document.getElementById('dataEmail').value = dataEmail || "";
    document.getElementById('btn-salvar').innerText = "ATUALIZAR DADOS";
    document.getElementById('btn-cancelar-edit').style.display = 'block';
    document.getElementById('box-importar').style.display = 'none';
}

function cancelarEdicao() {
    document.getElementById('edit-id').value = "";
    document.getElementById('empresa').value = "";
    document.getElementById('titulo').value = "";
    document.getElementById('dataVencimento').value = "";
    document.getElementById('dataEmail').value = "";
    document.getElementById('titulo-cadastro').innerText = "NOVA OBRIGAÇÃO";
    document.getElementById('btn-salvar').innerText = "SALVAR OBRIGAÇÃO";
    document.getElementById('btn-cancelar-edit').style.display = 'none';
    document.getElementById('box-importar').style.display = 'block';
}

function concluirObrigacao(id, empresa, titulo, vencimento, dataEmail) {
    if(confirm(`Concluir "${titulo}"?`)) {
        const dataFechamento = new Date().toLocaleDateString('pt-BR');
        refConcluidas.child(id).set({ id, empresa, titulo, vencimento, dataEmail, dataFechamento }).then(() => {
            refAtivas.child(id).remove();
        });
    }
}

function reativarObrigacao(id, empresa, titulo, vencimento, dataEmail) {
    if(confirm(`Reativar "${titulo}"?`)) {
        refAtivas.child(id).set({ id, empresa, titulo, vencimento, dataEmail: dataEmail || "" }).then(() => {
            refConcluidas.child(id).remove();
        });
        mostrarTela('tela-painel');
    }
}

// --- RENDERIZAÇÃO ---

function renderizarTicker(dados) { 
    const tickerContent = document.getElementById('ticker-content');
    if (!dados) { tickerContent.innerHTML = "Sem conclusões recentes."; return; }
    const ultimas = Object.values(dados).slice(-10).reverse();
    let html = "";
    ultimas.forEach(o => {
        html += `<div class="ticker-item">✅ ${o.empresa} <span>(${o.titulo} em ${o.dataFechamento})</span></div>`;
    });
    tickerContent.innerHTML = html;
}

function filtrarBusca() { renderizarPainel(cacheDadosAtivos); }

function renderizarPainel(dados) {
    const container = document.getElementById('painel-cards');
    const filtro = document.getElementById('busca-painel').value.toLowerCase();
    container.innerHTML = '';
    if(!dados) return;

    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    Object.values(dados).sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento)).forEach(o => {
        if (o.empresa.toLowerCase().includes(filtro) || o.titulo.toLowerCase().includes(filtro)) {
            const dataVenc = new Date(o.vencimento + 'T00:00:00');
            const diffDias = Math.ceil((dataVenc - hoje) / (1000 * 60 * 60 * 24));

            let classe = 'alerta-normal';
            if (diffDias < 0) classe = 'vencido';
            else if (diffDias <= 2) classe = 'alerta-curto';

            container.innerHTML += `
                <div class="card ${classe}">
                    <div style="cursor:pointer" onclick="concluirObrigacao('${o.id}','${o.empresa}','${o.titulo}','${o.vencimento}','${o.dataEmail || ''}')">
                        <div class="empresa-tag">${o.empresa}</div>
                        <h2>${o.titulo}</h2>
                        <p>📅 Vencimento: <strong>${o.vencimento.split('-').reverse().join('/')}</strong></p>
                        <p class="email-info">📧 E-mail: ${o.dataEmail ? o.dataEmail.split('-').reverse().join('/') : 'Pendente'}</p>
                    </div>
                    <div class="card-actions">
                        <button class="btn-action" onclick="prepararEdicao('${o.id}','${o.empresa}','${o.titulo}','${o.vencimento}','${o.dataEmail || ''}')">✏️</button>
                        <button class="btn-action" onclick="deletarObrigacao('${o.id}')">🗑️</button>
                    </div>
                </div>`;
        }
    });
}

function renderizarConsulta(dados) {
    const div = document.getElementById('lista-consulta');
    div.innerHTML = '';
    if(!dados) return;
    Object.values(dados).reverse().forEach(o => {
        // Formata a data do email enviada para o padrão BR
        const emailFormatado = o.dataEmail ? o.dataEmail.split('-').reverse().join('/') : 'Não informado';

        div.innerHTML += `
            <div class="consulta-item">
                <span>
                    <strong>${o.empresa}</strong> - ${o.titulo} <br>
                    <small>📧 E-mail Enviado em: ${emailFormatado} | ✅ Finalizado: ${o.dataFechamento}</small>
                </span>
                <button class="btn-action" style="filter:none" onclick="deletarHistorico('${o.id}')">🗑️</button>
            </div>`;
    });
}

function renderizarEstorno(dados) {
    const div = document.getElementById('lista-estorno');
    div.innerHTML = '';
    if(!dados) return;
    Object.values(dados).forEach(o => {
        div.innerHTML += `
            <div class="card-estorno" onclick="reativarObrigacao('${o.id}','${o.empresa}','${o.titulo}','${o.vencimento}','${o.dataEmail}')">
                <span>${o.empresa} - ${o.titulo}</span>
                <span style="color:var(--warning)">🔄 REATIVAR</span>
            </div>`;
    });
}

function gerarObrigacoesPadrao() {
    const dataVenc = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-10`;
    const titulos = ["FGTS DIGITAL", "SIMPLES NACIONAL", "DCTFWEB", "EFD REINF", "PIS/COFINS", "FOLHA PGTO"];
    if(confirm("Gerar obrigações para GERAL?")) {
        titulos.forEach(t => {
            const id = (Date.now() + Math.random()).toString().replace('.', '');
            refAtivas.child(id).set({ id, empresa: "GERAL", titulo: t, vencimento: dataVenc, dataEmail: "" });
        });
        mostrarTela('tela-painel');
    }
}