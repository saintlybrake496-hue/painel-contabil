// 1. CONFIGURAÇÃO DO SEU FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBsN6g6RuUgY9oQXxkuVsn2ckn2hfbZzL8",
  authDomain: "meu-painel-contabil.firebaseapp.com",
  databaseURL: "https://meu-painel-contabil-default-rtdb.firebaseio.com",
  projectId: "meu-painel-contabil",
  storageBucket: "meu-painel-contabil.firebasestorage.app",
  messagingSenderId: "369217483068",
  appId: "1:369217483068:web:4cfabe07fb3e1bade52e39"
};

// 2. INICIALIZAÇÃO
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Referências das "tabelas" na nuvem
const refAtivas = database.ref('obr_ativas');
const refConcluidas = database.ref('obr_concluidas');

// --- NAVEGAÇÃO ---
function mostrarTela(idTela) {
    document.querySelectorAll('.tela-section').forEach(tela => tela.classList.remove('ativo'));
    document.getElementById(idTela).classList.add('ativo');
    
    // No Firebase, não precisamos chamar renderizar toda hora, 
    // pois ele atualiza sozinho quando os dados mudam (veja os "on value" abaixo)
}

// --- ESCUTAR O BANCO EM TEMPO REAL (MUITO IMPORTANTE) ---
// Isso faz com que, se você abrir em outro PC, os dados apareçam sozinhos
refAtivas.on('value', (snapshot) => {
    const dados = snapshot.val();
    renderizarPainel(dados);
});

refConcluidas.on('value', (snapshot) => {
    const dados = snapshot.val();
    renderizarConsulta(dados);
    renderizarEstorno(dados);
});

// --- FUNÇÕES DE PERSISTÊNCIA (SALVAR NA NUVEM) ---

function adicionarObrigacao() {
    const empresa = document.getElementById('empresa').value;
    const titulo = document.getElementById('titulo').value;
    const vencimento = document.getElementById('dataVencimento').value;

    if (!empresa || !titulo || !vencimento) return alert("Preencha os campos obrigatórios!");

    const id = Date.now();
    const novaObr = { 
        id: id, 
        empresa: empresa.toUpperCase(), 
        titulo: titulo.toUpperCase(), 
        vencimento: vencimento 
    };

    // Salva no Firebase
    refAtivas.child(id).set(novaObr);

    // Limpa campos e volta para o painel
    document.getElementById('empresa').value = "";
    document.getElementById('titulo').value = "";
    document.getElementById('dataVencimento').value = "";
    mostrarTela('tela-painel');
}

function gerarObrigacoesPadrao() {
    const dataVenc = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-10`;
    const titulos = ["FGTS DIGITAL", "SIMPLES NACIONAL", "DCTFWEB (INSS)", "EFD REINF", "PIS/COFINS", "IRRF SOBRE FOLHA"];

    if(confirm("Gerar obrigações para GERAL no dia 10?")) {
        titulos.forEach(t => {
            const id = Date.now() + Math.random();
            refAtivas.child(id.toString().replace('.', '')).set({
                id: id,
                empresa: "GERAL",
                titulo: t,
                vencimento: dataVenc
            });
        });
        mostrarTela('tela-painel');
    }
}

function concluirObrigacao(id, empresa, titulo, vencimento) {
    if(confirm(`Concluir "${titulo}" de ${empresa}?`)) {
        const dataFechamento = new Date().toLocaleDateString('pt-BR');
        
        // Adiciona na tabela de concluídas
        refConcluidas.child(id).set({
            id, empresa, titulo, vencimento, dataFechamento
        });

        // Remove da tabela de ativas
        refAtivas.child(id).remove();
    }
}

function reativarObrigacao(id, empresa, titulo, vencimento) {
    if(confirm(`Reativar "${titulo}"?`)) {
        // Volta para ativas
        refAtivas.child(id).set({ id, empresa, titulo, vencimento });
        // Remove de concluídas
        refConcluidas.child(id).remove();
        mostrarTela('tela-painel');
    }
}

// --- RENDERIZAÇÃO ---

function renderizarPainel(dados) {
    const container = document.getElementById('painel-cards');
    if(!container) return;
    container.innerHTML = '';
    
    if(!dados) return; // Se o banco estiver vazio

    const hoje = new Date().toISOString().split('T')[0];
    
    // Transforma o objeto do Firebase em lista e ordena por data
    const lista = Object.values(dados).sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));

    lista.forEach(o => {
        const isVencido = o.vencimento < hoje;
        container.innerHTML += `
            <div class="card ${isVencido ? 'vencido' : ''}" 
                 onclick="concluirObrigacao('${o.id}', '${o.empresa}', '${o.titulo}', '${o.vencimento}')">
                <div class="empresa-tag">${o.empresa}</div>
                <h2>${o.titulo}</h2>
                <p>Vencimento: ${o.vencimento.split('-').reverse().join('/')}</p>
                ${isVencido ? '<span style="color:red; font-weight:bold;">ATRASADO</span>' : ''}
            </div>`;
    });
}

function renderizarConsulta(dados) {
    const listaDiv = document.getElementById('lista-consulta');
    if(!listaDiv) return;
    listaDiv.innerHTML = '';
    
    if(!dados) {
        listaDiv.innerHTML = '<p>Nenhuma obrigação concluída.</p>';
        return;
    }

    Object.values(dados).slice().reverse().forEach(o => {
        listaDiv.innerHTML += `
            <div class="consulta-item">
                <strong>${o.empresa}</strong> - ${o.titulo} 
                <br><small>Finalizado em: ${o.dataFechamento}</small>
            </div>`;
    });
}

function renderizarEstorno(dados) {
    const listaDiv = document.getElementById('lista-estorno');
    if(!listaDiv) return;
    listaDiv.innerHTML = '';
    
    if(!dados) return;

    Object.values(dados).forEach(o => {
        listaDiv.innerHTML += `
            <div class="card-estorno" onclick="reativarObrigacao('${o.id}', '${o.empresa}', '${o.titulo}', '${o.vencimento}')">
                <span>${o.empresa} - ${o.titulo}</span>
                <span>🔄 REATIVAR</span>
            </div>`;
    });
}

// Inicializa a tela
mostrarTela('tela-painel');