1. CRIAR AGENDAMENTO (POST)

curl -X POST "http://localhost:3001/api/agendamento" \
-H "Content-Type: application/json" \
-d '{
  "nome": "João da Silva",
  "telefone": "(41) 98903-7866",
  "servico": "Corte + Barba",
  "servicoValor": "corte-barba",
  "data": "2026-08-25",
  "horario": "10:00",
  "observacoes": "Degradê na lateral"
}'

2. LISTAR TODOS OS AGENDAMENTOS (GET)

curl -X GET "http://localhost:3001/api/agendamentos"

3. CONSULTAR HORÁRIOS OCUPADOS POR DATA (GET)

curl -X GET "http://localhost:3001/api/horarios-ocupados/2026-08-25"