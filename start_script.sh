#!/bin/bash

# Remove o arquivo temp_output.txt se existir
rm -f temp_output.txt

# Executa o comando tmole 3001 em segundo plano
tmole 3001 > temp_output.txt &

# Aguarda até que o arquivo temp_output.txt seja criado
while [ ! -f temp_output.txt ]; do
  sleep 10;
done

# Extrai o endereço do arquivo temporário
new_address=$(grep -Eo 'http://[a-zA-Z0-9./?=_-]+' temp_output.txt)

# Atualiza a variável no arquivo .env com o novo endereço
sed -i "s|^GSM_PORT=.*|GSM_PORT=$new_address|" .env

# Executa o comando yarn start
yarn start
