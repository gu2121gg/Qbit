// --- CONFIGURAÇÃO DA API ---
// IMPORTANTE: Aqui deve estar o endereço do seu servidor HidenCloud, não o do GitHub!
const API_URL = "http://zeus.hidencloud.com:24664"; 

const state = {
    token: localStorage.getItem('qbit_token') || null,
    projects: []
};

// --- UI UTILS ---
const toast = document.getElementById('toast');
const showToast = (msg) => {
    document.getElementById('toast-msg').innerText = msg;
    toast.classList.remove('translate-x-full');
    setTimeout(() => toast.classList.add('translate-x-full'), 3000);
};

const toggleLogin = (show) => {
    if(show && state.token) return;
    const screen = document.getElementById('login-screen');
    show ? screen.classList.remove('hidden') : screen.classList.add('hidden');
};

const toggleModal = () => {
    document.getElementById('modal').classList.toggle('hidden');
};

const updateAuthUI = () => {
    const adminPanel = document.getElementById('admin-panel');
    const authStatus = document.getElementById('auth-status');
    
    if (state.token) {
        adminPanel.classList.remove('hidden');
        authStatus.innerText = "Logado";
        authStatus.parentElement.classList.add('bg-white', 'text-black');
    } else {
        adminPanel.classList.add('hidden');
        authStatus.innerText = "Admin";
        authStatus.parentElement.classList.remove('bg-white', 'text-black');
    }
};

// --- CHAMADAS API ---

// 1. LOGIN
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('username', document.getElementById('username').value);
    formData.append('password', document.getElementById('password').value);

    try {
        const res = await fetch(`${API_URL}/token`, {
            method: 'POST',
            body: formData
        });
        
        if (!res.ok) throw new Error("Credenciais Inválidas");
        
        const data = await res.json();
        state.token = data.access_token;
        localStorage.setItem('qbit_token', state.token);
        
        showToast("Bem-vindo de volta!");
        toggleLogin(false);
        updateAuthUI();
        fetchProjects();
    } catch (err) {
        showToast(err.message);
    }
});

// 2. LOGOUT
const doLogout = () => {
    state.token = null;
    localStorage.removeItem('qbit_token');
    updateAuthUI();
    fetchProjects();
    showToast("Sessão Encerrada");
};

// 3. BUSCAR PROJETOS
async function fetchProjects() {
    try {
        const res = await fetch(`${API_URL}/projects`);
        if (!res.ok) throw new Error("Erro ao carregar dados");
        state.projects = await res.json();
        renderProjects();
    } catch (err) {
        console.error("Erro na API:", err);
        document.getElementById('projects-grid').innerHTML = `
            <div class="col-span-full text-center py-10 opacity-50">
                <i class="fas fa-exclamation-triangle mb-2"></i>
                <p>Servidor offline ou URL incorreta.</p>
            </div>
        `;
    }
}

// 4. RENDERIZAR
function renderProjects() {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = '';

    state.projects.forEach(p => {
        const hasFile = p.file_url && p.file_url !== "";
        const fileLink = hasFile ? `${API_URL}${p.file_url}` : "#";
        
        const card = `
            <div class="glass p-6 rounded-xl animate-slide-up flex flex-col h-full">
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-xl font-bold">${p.name}</h3>
                    ${hasFile ? '<i class="fas fa-file-code text-gray-600"></i>' : ''}
                </div>
                <p class="text-sm text-gray-400 mb-6 flex-grow">${p.description}</p>
                <div class="flex gap-2 items-center mt-auto pt-4 border-t border-white/5">
                    ${p.link ? `<a href="${p.link}" target="_blank" class="text-[10px] bg-white text-black px-3 py-2 rounded font-bold uppercase tracking-wider">Aceder</a>` : ''}
                    ${hasFile ? `<a href="${fileLink}" download class="text-[10px] border border-gray-700 px-3 py-2 rounded uppercase font-bold text-gray-400 hover:text-white">Download</a>` : ''}
                    ${state.token ? `<button onclick="deleteProject(${p.id})" class="ml-auto text-red-500 hover:scale-110 transition"><i class="fas fa-trash-alt"></i></button>` : ''}
                </div>
            </div>
        `;
        grid.innerHTML += card;
    });
}

// 5. UPLOAD
document.getElementById('add-project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.token) return;

    const form = e.target;
    const formData = new FormData(form);

    try {
        const res = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${state.token}` },
            body: formData
        });

        if (!res.ok) throw new Error("Erro no upload");

        showToast("Projeto Hospedado!");
        toggleModal();
        form.reset();
        document.getElementById('file-label').innerText = "Clique ou arraste um arquivo";
        fetchProjects();
    } catch (err) {
        showToast(err.message);
    }
});

// 6. DELETE
window.deleteProject = async (id) => {
    if(!confirm("Deseja apagar este projeto do servidor?")) return;

    try {
        const res = await fetch(`${API_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        if(res.ok) {
            showToast("Removido com sucesso");
            fetchProjects();
        }
    } catch(err) {
        showToast("Erro ao apagar");
    }
};

// UI: Feedback de arquivo
document.getElementById('file-upload').addEventListener('change', function(e) {
    const fileName = e.target.files[0]?.name || "Clique ou arraste um arquivo";
    document.getElementById('file-label').innerText = fileName;
});

// INIT
updateAuthUI();
fetchProjects();
