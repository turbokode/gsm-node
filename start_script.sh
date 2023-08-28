#!/bin/bash

# Diretório do projeto
project_dir="/home/turbokone/Documents/gsm-node"

# Caminhos para os arquivos
env_file="$project_dir/.env"
temp_output_file="$project_dir/temp_output.txt"

# Função para verificar a conectividade com a internet
check_internet() {
  while ! ping -c 1 google.com &> /dev/null; do
    echo "Aguardando conexão com a internet..."
    sleep 10
  done
}

# Verificar conectividade antes de prosseguir
check_internet

# Navegar para o diretório do projeto
cd "$project_dir" || exit 1

# Executa o comando tmole 3001 em segundo plano
nohup tmole 3001 > "$temp_output_file" 2>&1 &

# Aguarda até que o arquivo temp_output.txt seja criado
while [ ! -f "$temp_output_file" ]; do
  sleep 50;
done

# Extrai o endereço do arquivo temporário
new_address=$(grep -Eo 'http://[a-zA-Z0-9./?=_-]+' "$temp_output_file")

# Atualiza a variável no arquivo .env com o novo endereço
sed -i "s|^GSM_PORT=.*|GSM_PORT=$new_address|" "$env_file"

# Executa os comandos de build e start do projeto
yarn build
yarn start
