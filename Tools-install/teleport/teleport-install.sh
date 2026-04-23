sudo wget https://get.gravitational.com/teleport-v14.3.4-linux-amd64-bin.tar.gz
sudo tar -xzf teleport-v14.3.4-linux-amd64-bin.tar.gz
sudo mv teleport/tctl /usr/local/bin/
sudo mv teleport/tsh /usr/local/bin/
sudo mv teleport/teleport /usr/local/bin/
sudo teleport version && tctl version && tsh version
sudo mkdir -p /etc/teleport