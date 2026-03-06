let editingRow = null; // variável para armazenar a linha em edição
let taskId = 1; // variável para gerar IDs automaticamente

// Função para alternar entre as abas
function showTab(tabId) {
  const tabs = document.querySelectorAll('.tab-content');
  const buttons = document.querySelectorAll('.tab-button');
  
  tabs.forEach(tab => tab.classList.remove('active'));
  buttons.forEach(button => button.classList.remove('active'));
  
  document.getElementById(tabId).classList.add('active');
  const activeButton = Array.from(buttons).find(button => button.textContent.toLowerCase() === tabId.replace('tab', '').toLowerCase());
  activeButton.classList.add('active');
}

// Função para atualizar a Data de Término
function updateEndDate() {
  const status = document.getElementById('status').value;
  const endDateReal = document.getElementById('endDateReal');

  if (status === 'Concluída') {
    const today = new Date().toISOString().slice(0, 10); // Data atual no formato YYYY-MM-DD
    endDateReal.value = today;
  } else {
    endDateReal.value = ''; // Se não for "Concluída", o campo fica vazio
  }
}

// Função para adicionar ou editar uma atividade
document.getElementById('addActivityForm').addEventListener('submit', function(e) {
  e.preventDefault();

  const name = document.getElementById('activityName').value;
  const responsible = document.getElementById('responsible').value;
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value; // Data Prometida
  const status = document.getElementById('status').value;
  const observations = document.getElementById('observations').value;
  const dependencyId = document.getElementById('dependency').value; // ID da tarefa dependente
  const address = document.getElementById('address').value; // Endereço
  const endDateReal = document.getElementById('endDateReal').value; // Data de Término (nova)

  const isAtrasado = isLate(startDate, endDate);
  const currentId = taskId++; // Incrementa o ID para a próxima atividade

  // se estiver editando
  if (editingRow) {
    const cells = editingRow.getElementsByTagName('td');
    cells[1].textContent = name;
    cells[2].textContent = responsible;
    cells[3].textContent = startDate;
    cells[4].textContent = endDate;
    cells[5].textContent = status;
    cells[5].className = status.toLowerCase();
    cells[6].textContent = isAtrasado ? 'Atrasado' : 'No prazo';
    cells[6].className = isAtrasado ? 'atrasado' : '';
    cells[7].textContent = observations;
    cells[8].textContent = dependencyId || '-'; // Mostra o ID da dependência, ou "nenhuma" se vazio
    cells[9].textContent = address; // Atualiza o campo de endereço
    cells[10].textContent = endDateReal; // Atualiza a Data de Término

    editingRow = null; // limpa após edição
  } else {
    // Adicionar nova linha se não for edição
    const tableBody = document.querySelector('.activities-table tbody');
    const newRow = document.createElement('tr');

    newRow.innerHTML = `
      <td>${currentId}</td>
      <td>${name}</td>
      <td>${responsible}</td>
      <td>${startDate}</td>
      <td>${endDate}</td> <!-- Data Prometida -->
      <td class="${status.toLowerCase()}">${status}</td>
      <td class="${isAtrasado ? 'atrasado' : ''}">${isAtrasado ? 'Atrasado' : 'No prazo'}</td>
      <td>${observations}</td>
      <td>${dependencyId ? dependencyId : '-'}</td>
      <td>${address}</td> <!-- Endereço -->
      <td>${endDateReal}</td> <!-- Data de Término -->
      <td><button onclick="editActivity(this)">Editar</button></td>
    `;

    tableBody.appendChild(newRow);
  }

  document.getElementById('addActivityForm').reset();
  showTab('tab1');
});

// Função para verificar se a atividade está atrasada
function isLate(startDate, endDate) {
  const today = new Date();
  return new Date(endDate) < today;
}

// Função para editar uma atividade
function editActivity(button) {
  editingRow = button.closest('tr'); // guarda a linha que está sendo editada
  const cells = editingRow.getElementsByTagName('td');

  document.getElementById('activityName').value = cells[1].textContent;
  document.getElementById('responsible').value = cells[2].textContent;
  document.getElementById('startDate').value = cells[3].textContent;
  document.getElementById('endDate').value = cells[4].textContent;
  document.getElementById('status').value = cells[5].textContent;
  document.getElementById('observations').value = cells[7].textContent;
  document.getElementById('dependency').value = cells[8].textContent !== '-' ? cells[8].textContent : ''; // Preenche com o ID da dependência
  document.getElementById('address').value = cells[9].textContent; // Preenche o campo de endereço corretamente

  // Preenche a Data de Término se já estiver preenchido
  document.getElementById('endDateReal').value = cells[10].textContent;

  showTab('tab2'); // abre a aba de edição
}

// Função para calcular os dias de atraso
function calculateAtraso(dataPrometida, dataConclusao) {
  const data1 = new Date(dataPrometida);
  const data2 = new Date(dataConclusao);
  const diffTime = data2 - data1;
  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24)); // calcula a diferença em dias
  return diffDays > 0 ? `${diffDays} dias de atraso` : 'Sem atraso';
}

// Função para gerar o relatório em PDF
function generatePDF() {
  const { jsPDF } = window.jspdf; // Acessando o jsPDF a partir do namespace correto
  const doc = new jsPDF();

  // Adiciona título ao PDF
  doc.setFontSize(18);
  doc.text('Relatório de Cronograma de Marcenaria', 14, 16);

  // Cabeçalho da Tabela
  const tableColumns = ["ID", "Nome", "Responsável", "Data Início", "Data Prometida", "Status", "Atraso", "Observações", "Dependência", "Endereço", "Data de Término"];
  const tableData = [];

  // Obter os dados da tabela
  const rows = document.querySelectorAll('.activities-table tbody tr');

  // Preencher os dados da tabela
  rows.forEach(row => {
    const cells = row.getElementsByTagName('td');
    tableData.push([
      cells[0].textContent, // ID
      cells[1].textContent, // Nome
      cells[2].textContent, // Responsável
      cells[3].textContent, // Data Início
      cells[4].textContent, // Data Prometida
      cells[5].textContent, // Status
      cells[6].textContent, // Atraso
      cells[7].textContent, // Observações
      cells[8].textContent, // Dependência
      cells[9].textContent, // Endereço
      cells[10].textContent  // Data de Término
    ]);
  });

  // Adiciona a tabela ao PDF
  doc.autoTable({
    head: [tableColumns],
    body: tableData,
    startY: 30, // Início da tabela
  });

  // Salva o PDF com o nome 'relatorio_cronograma.pdf'
  doc.save('relatorio_cronograma.pdf');
}

// Função para filtrar atividades por status
function filterStatus() {
  const filterValue = document.getElementById('statusFilter').value.toLowerCase();
  const rows = document.querySelectorAll('.activities-table tbody tr');

  rows.forEach(row => {
    const statusCell = row.cells[5].textContent.toLowerCase();
    if (filterValue === 'todos' || filterValue === statusCell) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}
