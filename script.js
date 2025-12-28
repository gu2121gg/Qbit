        // --- CONFIGURAÇÃO DA API ---
        // Troque 'localhost' pelo IP da sua VPS HidenCloud quando fizer deploy
        const API_URL = "zeus.hidencloud.com:24664"; 
        
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
            if(show && state.token) {
                // Já logado, não mostra login, talvez logout ou profile
                return;
            }
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
                authStatus.parentElement.onclick = null; // Remove trigger de login
            } else {
                adminPanel.classList.add('hidden');
                authStatus.innerText = "Admin";
                authStatus.parentElement.classList.remove('bg-white', 'text-black');
                authStatus.parentElement.onclick = () => toggleLogin(true);
            }
        };

        // --- API CALLS ---

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
                
                if (!res.ok) throw new Error("Acesso Negado");
                
                const data = await res.json();
                state.token = data.access_token;
                localStorage.setItem('qbit_token', state.token);
                
                showToast("Acesso Admin Concedido");
                toggleLogin(false);
                updateAuthUI();
                renderProjects(); // Re-renderiza para mostrar botões de delete
            } catch (err) {
                showToast("Erro: " + err.message);
            }
        });

        const doLogout = () => {
            state.token = null;
            localStorage.removeItem('qbit_token');
            updateAuthUI();
            renderProjects();
            showToast("Desconectado");
        };

        // 2. GET PROJETOS
        async function fetchProjects() {
            try {
                const res = await fetch(`${API_URL}/projects`);
                if (!res.ok) throw new Error("API Offline");
                state.projects = await res.json();
                renderProjects();
            } catch (err) {
                console.error(err);
                document.getElementById('projects-grid').innerHTML = `
                    <div class="col-span-full text-center p-10 glass rounded-xl border border-red-900/50">
                        <i class="fas fa-wifi text-red-500 mb-2"></i>
                        <p class="text-gray-400">Não foi possível conectar ao servidor HidenCloud.</p>
                        <p class="text-xs text-gray-600 mt-2">Verifique se a API Python está rodando.</p>
                    </div>
                `;
            }
        }

        // 3. RENDERIZAR
        function renderProjects() {
            const grid = document.getElementById('projects-grid');
            grid.innerHTML = '';

            state.projects.forEach(p => {
                const hasFile = p.file_url && p.file_url !== "";
                const fileLink = hasFile ? `${API_URL}${p.file_url}` : "#";
                
                const deleteBtn = state.token ? `
                    <button onclick="deleteProject(${p.id})" class="text-red-500 hover:text-white text-xs uppercase font-bold ml-auto">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : '';

                const card = `
                    <article class="glass rounded-xl overflow-hidden group hover:border-gray-500 transition-all duration-500 flex flex-col">
                        <div class="h-2 bg-gradient-to-r from-gray-800 to-gray-600"></div>
                        <div class="p-6 flex-grow">
                            <div class="flex justify-between items-start mb-4">
                                <h3 class="text-xl font-bold text-white tracking-tight">${p.name}</h3>
                                ${hasFile ? '<i class="fas fa-paperclip text-gray-500"></i>' : ''}
                            </div>
                            <p class="text-sm text-gray-400 leading-relaxed mb-6">${p.description}</p>
                            
                            <div class="mt-auto flex gap-3 pt-4 border-t border-gray-800 items-center">
                                ${p.link ? `<a href="${p.link}" target="_blank" class="text-xs bg-white text-black px-3 py-2 rounded font-bold hover:opacity-80">VER PROJETO</a>` : ''}
                                
                                ${hasFile ? `<a href="${fileLink}" download target="_blank" class="text-xs border border-gray-600 text-gray-300 px-3 py-2 rounded hover:bg-gray-800 hover:text-white flex items-center gap-2"><i class="fas fa-download"></i> BAIXAR ARQUIVO</a>` : ''}
                                
                                ${deleteBtn}
                            </div>
                        </div>
                    </article>
                `;
                grid.innerHTML += card;
            });
        }

        // 4. ADD PROJETO (UPLOAD)
        document.getElementById('add-project-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!state.token) return showToast("Sessão Expirada");

            const form = e.target;
            const formData = new FormData(form);

            // Toast de Uploading...
            showToast("Enviando dados para o servidor...");

            try {
                const res = await fetch(`${API_URL}/projects`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${state.token}` // Envia token no header
                    },
                    body: formData // Fetch lida com multipart automaticamente
                });

                if (!res.ok) throw new Error("Erro ao salvar");

                showToast("Projeto Hospedado com Sucesso!");
                toggleModal();
                form.reset();
                fetchProjects(); // Recarrega lista
            } catch (err) {
                showToast("Falha: " + err.message);
            }
        });

        // 5. DELETE PROJETO
        window.deleteProject = async (id) => {
            if(!confirm("Tem certeza que deseja apagar este projeto do servidor?")) return;

            try {
                const res = await fetch(`${API_URL}/projects/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${state.token}` }
                });
                if(res.ok) {
                    showToast("Projeto Removido");
                    fetchProjects();
                }
            } catch(err) {
                showToast("Erro ao deletar");
            }
        };

        // UI: Atualizar nome do arquivo no input
        document.getElementById('file-upload').addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name || "Clique ou arraste um arquivo";
            document.getElementById('file-label').innerText = fileName;
            document.getElementById('file-label').classList.add('text-white');
        });

        // INIT
        updateAuthUI();
        fetchProjects();
