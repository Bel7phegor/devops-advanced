sudo apt update && sudo apt upgrade
sudo add-apt-repository ppa:linuxuprising/java -y
sudo apt update
sudo apt install oracle-java17-installer oracle-java17-set-default
sudo java --version
sudo wget -p -O - https://pkg.jenkins.io/debian/jenkins.io.key | apt-key add -
sudo sh -c 'echo deb http://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 5BA31D57EF5975CA
sudo apt-get update
sudo apt install jenkins -y
sudo systemctl start jenkins