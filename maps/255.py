import os
import subprocess

maps_dir = os.path.dirname(os.path.abspath(__file__))

input_file = "output.tif"

imagemagick_command = ["magick", input_file, "-evaluate", "Divide", "65535", "-evaluate", "Multiply", "255", input_file]

def process_maps():
    if not os.path.exists(maps_dir):
        print(f"Diretório {maps_dir} não encontrado!")
        return

    for subfolder in os.listdir(maps_dir):
        subfolder_path = os.path.join(maps_dir, subfolder)
        
        if os.path.isdir(subfolder_path):
            print(f"Processando pasta: {subfolder}")
            
            input_file_path = os.path.join(subfolder_path, input_file)
            
            if os.path.exists(input_file_path):
                try:
                    os.chdir(subfolder_path)
                    
                    print(f"Executando comando em {input_file_path}...")
                    subprocess.run(imagemagick_command, check=True)
                    print(f"Arquivo {input_file} processado com sucesso na pasta {subfolder}.")
                except subprocess.CalledProcessError as e:
                    print(f"Erro ao processar {input_file} na pasta {subfolder}: {e}")
                except Exception as e:
                    print(f"Erro inesperado na pasta {subfolder}: {e}")
            else:
                print(f"Arquivo {input_file} não encontrado na pasta {subfolder}.")
        else:
            print(f"{subfolder} não é uma pasta, ignorando.")

if __name__ == "__main__":
    print("Iniciando processamento dos mapas...")
    process_maps()
    print("Processamento concluído.")