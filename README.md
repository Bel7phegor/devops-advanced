# Triển khai công cụ quản lý truy cập trên máy chủ doanh nghiệp 
## Thực hiện trên server Teleport (cài version cũ để upgrade)
- Cài đặt teleport-server: [teleport-install.sh](/Tools-install/teleport/teleport-install.sh)
- Tạo file cấu hình teleport: `vi /etc/teleport/` [teleport.yaml](/Files-config/Teleport-server/teleport.yaml)
- Tạo file service `vi /etc/systemd/system/` [teleport.service](/Files-config/Teleport-server/teleport.service)
- Khởi động teleport
    ```
    systemctl daemon-reload
    systemctl start teleport
    systemctl status teleport
    ```
## Thực hiện trên server Loadbalancer
    ```
    apt install apache2-utils certbot python3-certbot-nginx -y
    sudo certbot certonly --standalone -d teleport-onpre.anphuc.site --preferred-challenges http --agree-tos -m $EMAIL --keep-until-expiring
    ```
- Tạo file cấu hình nginx `vi /etc/nginx/conf.d/lb.conf`
    ```
    server {
        server_name teleport-onpre.anphuc.site;
    location / {
            proxy_pass https://192.168.100.103:443;  
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        } 
    listen 443 ssl;
        ssl_certificate /etc/letsencrypt/live/teleport-onpre.anphuc.site/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/teleport-onpre.anphuc.site/privkey.pem;
        include /etc/letsencrypt/options-ssl-nginx.conf;
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;   
    }
    server {
        if ($host = teleport.anphuc.lab) {
            return 301 https://$host$request_uri;
        }
    listen 80;
        server_name nginx.elroydev.tech; 
        return 404;
    }
    ```
- Copy chứng chỉ sang server teleport
    ````
    scp /etc/letsencrypt/live/teleport-onpre.devopseduvn.live/fullchain.pem root@192.168.100.103:/etc/teleport/teleport.crt
    scp /etc/letsencrypt/live/teleport-onpre.devopseduvn.live/privkey.pem root@192.168.100.103:/etc/teleport/teleport.key
    ```
## Thực hiện trên server Teleport
- Cấp quyền thực thi cho file cert
    ```
    chmod 600 /etc/teleport/teleport.key
    chmod 644 /etc/teleport/teleport.crt
    ```
- Cập nhật lại cấu hình teleport nội dung cấu hình
    ```
    version: v3
    teleport:
    nodename: teleport
    data_dir: /var/lib/teleport
    log:
        output: stderr
        severity: INFO
        format:
        output: text
    ca_pin: ""
    diag_addr: ""
    auth_service:
    enabled: "yes"
    listen_addr: 0.0.0.0:3025
    cluster_name: teleport-onpre.anphuc.site
    proxy_listener_mode: multiplex
    ssh_service:
    enabled: "yes"
    proxy_service:
    enabled: "yes"
    web_listen_addr: 0.0.0.0:443
    public_addr: teleport-onpre.anphuc.site:443
    https_keypairs:
        - cert_file: /etc/teleport/teleport.crt
        key_file: /etc/teleport/teleport.key
    https_keypairs_reload_interval: 0s
    ```
- Khởi động lại teleport và tạo tài khoảng
    ```
    systemctl restart teleport
    tctl users add admin --roles=editor,access --logins=root
    ```
# Cài đặt cụm quản lý dữ liệu đảm bảo HA
- Nên cài đặt database bằng cách trực tiếp trên server, không nên sử dụng container. 
- Dựng 1 hạ tầng lưu trữ dữ liệu đảm bảo HA sử dụng 
- Sử dụng 3 server để tối ưu và giảm server đi nếu tài nguyên không nhiều 
## Mô hình
- Với 3 server sẽ là gom lại thành 1 cụm cluster FS để lưu trữ theo dạng đồng bộ, sử dụng cài đặt NFS server 
## Cấu hình và cài đặt 
### Cấu hình 
- Tạo 3 server với name data-master-1/2/3 và với dãy địa chỉ .9->.11
- Để thông số tùy thuộc vào dữ liệu mình làm, có thể là 1Gb, 2Gb
- Add thêm 1 disk ở mỗi server (10Gb)
- Đổi địa chỉ IP , đổi hostname
- Add host đồng loạt trên cả 3 server: `vi /etc/hosts`

    ``` 
    192.168.100.109 storage-master-1
    192.168.100.110 storage-master-2
    192.168.100.111 storage-master-3
    ```
- Ta có 1 Disk 10GB và mouts cái disk này vào `/data` 
    ```
    sudo mkfs.ext4 -m 0 /dev/sdb
    mkdir /data
    echo "/dev/sdb /data ext4 defaults 0 0" | sudo tee -a /etc/fstab
    mount -a
    sudo df -h
    ```
- Sau khi mount xong rồi chạy lại `mount -a `
### Cài đặt Cluster FS
- Cài đặt và cấu hình GlusterFS trên cả 3 servers
    ```
    sudo apt install glusterfs-server -y
    sudo systemctl start glusterd && sudo systemctl enable glusterd
    ```
- Đứng ở server 1 và tạo peer đến 2 server còn lại 
    ```
    sudo gluster peer probe storage-master-2
    sudo gluster peer probe storage-master-3
    sudo gluster peer status
    sudo gluster volume create vol_anphuc_storage replica 3 transport tcp storage-master-1:/data/anphuc storage-master-2:/data/anphuc storage-master-3:/data/anphuc
    sudo gluster volume start vol_anphuc_storage
    ```
- Kiểm tra trong thư mục `/data` và cấp quyền cho thư mục
    ```
    sudo mkdir -p /data/
    sudo chown -R nobody:nogroup /data/
    ```

# DEVSECOPS
## Triển khai dự án fullstack ecommerce 
![alt text](/Images/image.png)
- Triển khai với backend và frontend thành những dự án riêng biệt và giao tiếp với nhau qua API 
- Tách biệt server-db và server triển khai dự án 
### Triển khai cài đặt các cụm server 
- Sử dụng 2 server: 1 dev và 1 database server
#### Dự án backend
##### Database server
- Cài đặt sql server = docker và sử dụng cloud beaver để quản lý database
	- Cài docker: [docker-install.sh](/Tools-install/docker/docker-install.sh), `chmod +x docker-install.sh`
	- Tạo ra thư mục /tools/sqlserver và di chuyển vào 
	- File docker-compose cài đặt Sql server: [sql-server-docker-compose.yml](/Tools-install/sql-server/docker-compose.yml)
	- Tạo ra thư mục /tools/cloudbeaver và tạo file : [cloudbeaver-docker-compose.yml](/Tools-install/cloudbeaver/docker-compose.yml)
	- Chạy docker-compose up -d 
- Truy cập vào IP:8978 để truy cập vào giao diện của cloud beaver 
	- Sau đó đăng nhập với tài khoản và mật khẩu admin
	- Tiếp đến là đăng nhập vào và tạo connect mới với SQL server trước đó phải tạo database mới bên trong container trước 
		- `docker exec -it sqlserver /opt/mssql-tools/bin/sqlcmd -S "địa chỉ database-server" -U sa -P "password vừa tạo trên container" `
            
            ```
            create database OnlineShopDB;
            GO
            ```
	- Quay lại và điền vào phần Authentication username và password để test connect tới 
- Quay lại dự án fullstack 
	- Mỗi dự án backend đều có 1 file kết nối đến database và để biết file nào ta cần research để biết ví dụ `netcore connectionstring database file` -> thấy file `appsettings.json`
	- Sửa địa chỉ IP và Password  của database khác nếu thay đổi 
	- Tìm nguyên dự án địa chỉ `192.168.213.102` -> thay thành địa chỉ của `dev-server` để dự án có thể chạy được 
	- Thêm file `table-init.sql` để có được dữ liệu vào databse 
	- Thêm dữ liệu ở góc dưới cùng và file `data-init.sql` sau đó nhấn execute và kiểm tra ở product và user đã được
	- Thử login với user và password ở phần post (không quan trọng)
##### Dev server 
- Copy zip dự án vào server sử dụng `scp` 
- Tiến hành tạo 1 thư mục `projects` và di chuyển dự án vào thư mục này và giải nén 
	- Sử dụng các cách research để tìm được cách tải các công cụ liên quan để chạy được dự án
	- Search `install netcore 6 on ubuntu` : [netcore6-install.sh](/Tools-install/netcore/netcore6-install.sh)
	- Tạo user cho dự án `adduser onlineshop` và thay đổi quyền cho user này và đổi qua user đó 
	- Search tiếp `How to run dotnet project with cmd`
		```
		dotnet restore: khôi phục lại những dependences và những công cụ 
		dotnet build: xây dựng dự án với những phụ thuộc của nó 
		dotnet run: chạy dự án
		```
	```
	dotnet restore
	nohup dotnet run > log/txt 2>&1 & 
	```
	- Chạy thành công với port 5214 và /swagger để truy cập vào  
	- Sau đó tạo các tables bằng file sql 
- Với việc triển khai dự án ta có 2 cách chính 1 là database first và code first
	- Những dự án chạy code first giúp triển khai toàn diện và giúp cho dev control được nhiều hơn 
#### Dự án fontend 
- Search `how to run reacte project` cài đặt nodejs : [nodejs18-install.sh](/Tools-install/nodejs/nodejs-18-install.sh)
- Di chuyển vào thư mục fontend và chạy dự án 
	```
	npm install --force (build ra 1 thư mục node modules )
	npm start 
	```
  - Kiểm tra với IP:3000 
- Ta có thể chạy dự án chuyên nghiệp hơn với `PM2` 
	- Search `install pm2 with npm` chạy root
	```
	npm install pm2@latest -g 
	```
	- Sau đó quay lại user onlineshop và chạy lệnh
	```
	pm2 start npm --name onlineshop-fontend -- run "start"
	pm2 mornitor 
	```
## Thiết lập dự án trên Gitlab
- (dev-server) Kill hết tiến trình chạy dự án trước đó 
    - Vào Gitlab-server để tạo group và project mới để thực hiện clone về dev-server 
    -  Truy cập vào thư mục /home/onlineshop và triển khai clone git đã tạo từ gitlab
## Quy trình triển khai mọi dự án
- Các công ty thường có 3 môi trường: dev, staging(pre-product), production
- 3 Cách triển khai dự án:
    - Dạng services (chạy trực tiếp triên linux)
    - Chạy trên container standalone (chạy các dự án độc lập bằng docker)
    - Chạy container orchestration (k8s, docker swam)
- 2 Phương pháp triển khai:
    - Build và deploy cùng server 
    - Build và deploy khác server
- Quy trình pipeline devsecops chia làm 3 phần
    - Build
    - Test
    - Deploy
- Pipeline DevSecOps workflow
    - Commit -> SAST -> SCA -> Build -> Artifact -> Image Scan -> Deploy -> DAST 

    ![alt text](/Images/image.png)

    - Họp team
    - (Pre-commit)Dev sẽ cấu hình làm sao cho đảm secure làm sao cho đảm bảo bảo mật thông tin (tùy công ty)
    - 4. Bước đảm bảo an toàn bảo mật trên server build dự án, bước CI 
    - 5. `Phân tích mã nguồn (SAST)`:Sau khi commit code lên xong thì có 1 bước là code analysis quét bảo mật cho source code để đảm bảo code có clean hay không, hay có những biến những hàm nào chưa phù hợp hay không (Dev code xong -> ném vào 1 công nghệ -> cn đó sẽ phân tích code và xem code đó có đủ yêu cầu để tiếp tục đến các bước tiếp theo hay không)
    - 6. `Composition analysis (SCA)`: phân tích thành phần phần mềm, quá trình này sẽ kiểm tra và đánh giá các thành phần của phần mềm bao gồm các thư viện, framework và các modules của phần mềm mục tiêu là để `phát hiện ra các vấn đề bảo mật xem đã tuân thủ các giấy phép và các rủi ro khác liên quan đến các thành phần bên thứ 3` (Tools: Snyk)
    - 7. CI Server deploy to test: (Build và deploy dự án) dựa trên 3 môi trường và 3 cách triền khai với 2 phương pháp ở trên 
        - VD: ở trên mt Dev triển khai dự án là service có thể build và deploy trên 1 server build và server deploy riêng hoặc chung và kết quả build được cần lưu ở 1 chỗ là artifacts tương tự tren container standalone còn với triển khai bằng k8s thì chỉ có thể build và deploy khác server, không thể chạy trực tiếp độc lập các thành phần
    - 8-9. Security tests và Security review: Bước này là unit tests (chủ yếu ở các công ty lớn, mạnh mới áp dụng bước này vào) -> bước này là hoàn toàn Dev viết (Bước này không nằm trong pipeline bước này do tester làm)
    - 10. Image Assurance: Bước quét bảo mật của docker images vì docker cũng có các hệ điều hành và các cài đặt các công cụ cần thieesy để chạy được dự án (nằm ở cách triển khai thư 2 và 3)
    - 11. Deploy to production: 
    - 12-13-14: Tùy thuộc vào công ty quy định chính xác về phần hạ tầng, truy cập, quản lý và network cũng như các quy định bảo mật riêng cho ứng dụng và cho hạ tầng, dữ liệu (văn bản cụ thể, giới hạn truy cập, network đi ntn, kế hoach nâng cấp,...)
    - 15. Vulnerability scanning (quét lỗ hổng bảo mật sau khi đã build và deploy lên trên product) có thể áp dụng từ cả bước pre-product và product: sau khi chạy website hoàn chỉnh, bước này sẽ giả lập để tấn công website như XSS, SQL Injection,... để xem có những lỗ hổng nào khi website chạy thật
    - 16. Bước monitoring và bảo cáo
- Các bước chính 

    ![alt text](/Images/image-1.png)

    - Dev: Dev commit code lên git server 
        - Tiến hành phân tích mã nguồn
        - Sau đó đến SCA 
        - Sau đó build và test trên server 
        - Sau đó đến bước unit test
    - Repository: Mình sẽ có repository để lưu trữ các thành phần, các bản build ở dự án service và registry để lưu docker images của 2 cách triên khai dưới 
        - Image Scan: quét bảo mật docker images
    - Pre-prod: Sau khi scan image xong để triên khai dự án thì sẽ chạy bằng container ở pre-product, và hoàn toàn có thể chạy k8s ở cả các quá trình
        - DAST: giả lập quá trình tấn công 
        - Perfomance test: kiểm tra hiệu xuất sau đó mới đưa lên trên môi trường product (chạy độc lập hoặc chạy nhiều container rồi tiến hành kiểm tra perfomance rồi sizing làm sao cho phù hợp nhất, tối ưu nhất, lúc đó với deploy lên mt production)
    - Product: ở trên prod hoàn toàn có thể chạy container hoặc bằng k8s `tùy thuộc vào cty`
        - Pentest: giả lập quá trình tấn công 
        - Report: qua các kiểm tra, báo cáo rồi lưu lại để qua từng triển khai từng version có cải thiện gì không
- Hãy cân nhắc tùy thuộc vào công ty, dự án để áp dụng các quy trình bảo mật như trên
## Bản chất của việc triển khai tự động
![alt text](/Images/image-2.png)

- 3 Công cụ thịnh hành để chạy CI/CD: Gitlab, jenkins, argo 
- Chạy độc lập bằng daemon, chạy bằng docker và chạy bằng k8s 
- Gitlab CI/CD:
    - Gitlab-runner là 1 con robot và file yaml là kịch bản để con robot đó có thể đọc được từ file yaml ra và thực hiện các công việc
## Các chiến lược gitlab runner 
- Chiến lược
    - For an instance runner: phải là admin 
        - Tạo ra 1 con robot để mọi người dù bất kỳ ai có thể sử dụng 
        - Build dự án và test 1 dự án nhanh chóng mà không cần phải yêu cầu 1 con runner nào cụ thể cả
    - For a group runner: Gán với group và phải là owner của group đó 
        - Từng group sẽ có 1 con runner 
        - Từng dự án ở trong group đó đều có thể sử dụng con runner đó 
        - Tách biệt và chỉ sử dụng cho group đó thôi
        - Tránh lỗi phát sinh và người dùng khác sd 
    - For a project runner: Gán với 1 project cố định và người dùng ở project đó có thể chia sẻ con runner đó nếu muốn
- Cách cấu hình từng chiến lược cụ thể sau khi đã có runner trên server
    - For an instance runner
        - Vào Admin -> Runner -> Register an instance runner 
        - Đặt tên bằng cách `chiến lược triển khai - executor` 
        - VD: share-runner-dev-shell
    - For a group runner:
        - Vào Group -> runner -> register an instance runner
        - Đặt tên bằng cách `chiến lược triển khai - executor` 
        - VD: Online-shop-runner-dev-shell
    - For a project
        - Vào Project -> runner -> register an instance runner 
        - Có thể sử dụng của cả share và group runner nếu muốn và có thể tạo thêm runner cho riêng nó 
        - Khi nào nên tạo: ở những project nằm độc lập hoặc project đang nằm ở server đang chạy những tác vụ riêng biệt ta mới nên tạo ở trong project
## Quy trình 1 (Chạy dự án bằng daemon) 
### Backend 
- Tạo nhánh `pipeline-be-1` và viết file [.gitlab-ci.yml](/Files-config/Backend/Gitlab/pipeline-be-1/.gitlab-ci.yml)
### Frontend
- Tạo nhánh `pipeline-fe-1` và viết file [.gitlab-ci.yml](/Files-config/Frontend/Gitlab/pipeline-fe-1/.gitlab-ci.yml)
## Quy trình 2 (Tạo thêm artifacts và lưu code đã build để thuận tiện việc rollback)
### Thông tin, lý thuyết cần có 
- Artifacts CI/CD
    - Đảm bảo, tiết kiệm tài nguyên, thời gian build không bị lặp lại các tiến trình
    - Việc quản lý tường minh hơn lưu trữ theo từng folder hay theo thừng file 
    - Không bị dư thừa tiến trình giống nhau không cần thiết
    - Khi lưu trữ lại sau 1 thời gian ta có thể đem kết quả đó so sánh với chất lượng hiện tại, cải thiệt ntn
- Sử dụng `JFrog Artifacts`
    - Build xong -> đẩy kq lên đây và deploy kéo các file đó và deploy, sử dụng các phân tích
    - Build và deploy thì cần phải cài runner riêng cho từng server
- Tạo thêm server `build-server` có thể sử dụng `database-server` làm server build để đỡ tốn tài nguyên và 1 server `artifacts JFrog` và adđ hosts là `jfrog.anphuc.site`
### Trên server `artifacts JFrog`
- Search `jfrog install docker`
- Tạo thư mục để lưu trữ lại data của JFrog `mkdir -p /tools/jfrog/data`
- Cài đặt `docker`: `sudo apt install docker.io -y`
- Cài đặt `artifacts jfrog`: 

    ```
    docker run --name artifactory-jfrog --restart unless-stopped -v /tools/jfrog/data/:/var/opt/jfrog/artifactory -d -p 8081:8081 -p 8082:8082 releases-docker.jfrog.io/jfrog/artifactory-oss:7.77.5
    ```
- Gặp lỗi thì thấy không có quyền và chạy `chown -R 1030:1030 /tools/jfrog/` và chạy lại `docker restart artifactory-jfrog` 
- Truy cập domain với port `8082` đăng nhập với `admin` và `password`
- Reverse proxy cài nginx `sudo apt install nginx` sửa file cấu hình nginx ở `/etc/nginx/sites-available/default` đổi port 80 thành port 9999 
- Tạo file [`vi /etc/nginx/conf.d/jfrog.anphuc.site.conf`](/Files-config/JFrog/jfrog.anphuc.site.conf) và restart lại cấu hình nginx `systemctl restart nginx`
- Tạo 1 repo riêng cho dự án `online-shop` và phần enviromments để là DEV
- Vào User và tạo user `onlineshop` và bỏ group mặc định và thêm quyền của user này vào repo kia 
- Vào `Permissions` và add repo `online-shop` với tên là `onlineshop-perms` và thêm user vừa tạo `onlineshop` và set quyền `Manage`
### Trên `server build`
    - Cài đặt [netcore6](/Tools-install/netcore/netcore6-install.sh) và [nodejs18](/Tools-install/nodejs/nodejs-18-install.sh)
    - Câu lệnh để đẩy file và kéo file về từ `artifacts` là 
        ```
        curl -X PUT -u user:'password' -T file "http://jfrog.anphuc.site/artifactory/online-shop/file"
        curl -u user:'password' -O "http://jfrog.anphuc.site/artifactory/online-shop/file"
        ```
    - Tư duy là build xong zip lại đẩy lên artifacts sau đó deploy thì kéo về giải nén và chạy
### Tích hợp vào `ci/cd`
- Tạo ra nhánh `pipeline-be-2` từ `pipeline-be-1` và sửa file [.gitlab-ci.yml](/Files-config/Backend/Gitlab/pipeline-be-2/.gitlab-ci.yml)
    - Thử tạo tag và kiểm tra tiến trình
- Làm tương tự với frontend
## Quy trình 3 (Chạy dự án bằng docker độc lập)
- Kiểm tra và kill dự án chạy daemon trước đó 
- Cài đặt docker : [docker-install.sh](/Tools-install/docker/docker-install.sh)
- Nghiên cứu `docker workflow` 
    - Từ 1 source code -> viết dockerfile -> Tạo docker image từ dockerfile đó và có thể tạo docker-compose (có hoặc không có đều được) -> sau đó đẩy lên dockerhub -> pull docker image về server và chạy lên
- Di chuyển đến thư mục `/home/onlineshop/` và triển khai dự án `backend` trước
    - Viết [Dockerfile-backend](/Files-config/Backend/Dockerfile)
        - Tìm công cụ `docker image netcore 6`
    - docker build -t online-shop-backend:v1 -f Dockerfile .
    - docker run --name online-shop-backend -dp 5214:5214 online-shop-backend:v1
- Quay lại gitlab project backend tạo thêm 1 branch `pipeline-be-3` - tạo từ `pipeline-be-1` 
    - Tạo dockerfile và sửa .gitlab-ci.yml
    - Thêm user gitlab-runner và onlineshop vào group docker để đủ quyền để chạy và xóa docker 
    - Commit và tạo tag tương ứng để chạy dự án 
## Quy trình 4 (Dựng lên 1 kho lưu trữ các docker image) 
### Các yêu cầu, quy trình thiết lập ban đầu
- Search `container registry tools`
    - Sử dụng bên thứ 3 `AWS ECR`
    - Dựng AWS để làm phần này hoặc dựng VPS khoảng 2GB ram 
- Search `gitlab container registry`: chứa các phần cấu hình của gitlab-ci theo mẫu và build và push bằng domain lên registry tự tạo
- Sử dụng `Portus` để làm registry
    - Sử dụng EC2 để dựng lên server và cài dịch vụ này 
    - Với `ubuntu 22.04, t2.small, store 15Gb`
    - Cần 1 domain để sử dụng và trỏ đến địa chỉ ip public của AWS vd `portus.anphuc.site`
### Cấu hình chính
- Cấu hình update, và cài đặt docker, docker-compose, certbot để xác thực ssl 
    ```
    apt install -y docker.io docker-compose certbot net-tools
    ```
- Tạo thư mục làm việc riêng và tiến hành cài đặt 
    ```
    mkdir -p /tools/portus
    git clone https://github.com/SUSE/Portus.git
    mv Portus/examples/compose/ . 
    rm -rf Portus/
    cd compose
    ```
    
- Sinh ra cặp key để cấu hình https và sẽ có được 2 file `fullchain.pem & privkey.pem`
    ```
    sudo certbot certonly --standalone -d portus.anphuc.site --preferred-challenges http --agree-tos -m phucan2370@gmail.com --keep-until-expiring
    ```
- Vào file nginx/nginx.conf và chỉnh sửa đường dẫn ss;_certificate /secret/... và tắt tùy chọn `ssl on`
    ```
    cp .../fullchain.pem secrets/portus.crt
    cp .../privkey.pem secrets/portus.crt
    ```
- Sửa file `.env` vi .env sửa domain và password nếu muốn
    ```
    MACHINE_FQDN=portus.anphuc.site
    PORTUS_PASSWORD=Anphuc@1231
    ```
- Chạy docker-compose
    ```
    docker-compose -f docker-compose.clair-ssl.yml up -d
    ```
- Tạo tk admin và tạo registry với name:`registry-devsecops-series` và hostname: `portus.anphuc.site` và `Use SSL` 
- Tạo user onlineshop với quyền admin và tạo team với name:`onlineshop-team`, onwer:`onlineshop`
- Quay lại server và push các image lên trên registry
    ```
    docker tag online-shop-backend:... portus.anphuc.site/onlineshop/online-shop-backend:... 
    docker login portus.anphuc.site -u onlineshop -p Anphuc@1231
    docker push portus.anphuc.site/onlineshop/online-shop-backend:... 
    ```
- Thử pull về và run thử 
    ```
    docker pull docker push portus.anphuc.site/onlineshop/online-shop-backend:...
    ```
- Vào lại gitlab và tạo 1 branch `pipeline-be-4` từ `pipeline-be-2` và sửa file Backend [.gitlab-ci.yml](/Files-config/Backend/Gitlab/pipeline-be-4/.gitlab-ci.yml)
* `Nếu tắt và khởi động lại EC2 thì phải restart lại portus`

    ```
    cd /tools/portus/compose 
    docker-compose -f docker-compose.clair-ssl.yml up restart 
    ```
- Tạo tag và tiến hành kiểm tra
- Dự án `frontend` tiến hành tạo branch mới và tạo [Dockerfile-frontend](/Files-config/Frontend/Dockerfile)
    - Với Frontend [.gitlab-ci.yml](/Files-config/Frontend/Gitlab/pipeline-fe-4/.gitlab-ci.yml) 
- Quay lại server và push các image lên trên registry
    ```
    docker tag online-shop-frontend:... portus.anphuc.site/onlineshop/online-shop-frontend:... 
    docker login portus.anphuc.site -u onlineshop -p Anphuc@1231
    docker push portus.anphuc.site/onlineshop/online-shop-frontend:... 
    ```
- Thử pull về và run thử 
    ```
    docker pull docker push portus.anphuc.site/onlineshop/online-shop-frontend:...
    ```
## Quy trình 5 (Tư duy bảo vệ file tự động)
- Dự án trong 1 nhóm thường chỉnh sửa được file `.gitlab-ci.yml` nên cần phải thay đổi vị trí và không nên thường xuyên sửa đổi file tự động này tránh được việc dev sửa đổi file pipeline này 
- Cấu hình tăng sự kiểm soát và giảm sự thay đổi đến các file cấu hình đó
- `Cách 1`: Sử dụng include của gitlab viết cấu hình ở 1 nơi khác và trong dự án chỉ cần include vào cái file, dự án đó thôi và những người khác sẽ không thể đủ quyền để sửa được cái file này
    - Lấy nhánh `pipeline-be-3` đang chạy ở container độc lập tạo ra nhành `pipeline-be-5`
    - Tạo 1 group mới là `config` và để là `private` 
    - Tạo project `pipeline` 
    - Tạo mới file `online-shop-backend.yml` có copy nội dung của file [.gitlab-ci.yml](/Files-config/Backend/Gitlab/pipeline-be-3/.gitlab-ci.yml) của pipeline-be-3 xóa path project và lưu lại 
    - Cấu hình cho group `online shop` là member của project config sau đó chỉ cho role là `Developer`
    - Sau đó quay lại nhánh `pipeline-be-5` và file [.gitlab-ci.yml](/Files-config/Backend/Gitlab/pipeline-be-5/.gitlab-ci.yml)
    - Tạo tag và thử
- `Cách 2`: Xóa luôn file `.gitlab-ci.yml` sau đó vào setting -> CI/CD -> general pipeline -> CI/CD config file 
    - Điền vào `online-shop-backend.yml@config/pipeline` và save
    - Tạo ra 1 brach `pipeline-be-6` từ `pipeline-be-5` 
    - Xóa file `.gitlab-ci.yml` 
    - Tạo tag và kiểm tra tiến trình
## Quy trình 6 SAST (Thiết lập quét mã nguồn, kiểm tra source code) 
### Phương hướng, thiết lập tư duy 
- Bảo mật mã nguồn, áp dụng công nghệ, công cụ để quét hoặc kiểm tra được source code có những phần nào chưa hợp lý, như chưa clean code, có những chỗ chưa hợp lý, lộ token, ... những repo,trường để viết cái cần thiết 
- Dựng môi trường, dựng công nghệ để phát hiện ra các lỗ hỗng bảo mật source code và các dev sẽ tiến hành fix 
- Bảo mật về hạ tầng, lỗ hổng của server, docker images, container,... kiểm tra, quét ra có những cách thức fix phù hợp
- Các cách thức và mô hình
- Sử dụng công cụ quản lý mật khẩu: 3 phương pháp chính
    - Sử dụng nền tảng hạ tầng bên thứ 3
    - Cài đặt công cụ như 1 web service
    - Công cụ lưu trữ trong máu cục bộ và database là dạng file mã hóa
- Mã nguồn được quét sẽ lưu ở bên thứ 3 hay lưu trực tiếp ở trong web-server mà ta tự dựng hay kết quả được quét ra được lưu dưới dạng file,... Ưu tiên sử dụng cách thứ 2 và thứ 3 hạn chế lưu ở bên thứ 3 
- Quét bảo mật bên phía dev
    - Search `Best Static code analysis tools` tìm công cụ có những hộ trợ, có những công nghệ có xứng đáng để chuyển từ các cách khác nhau
      - `SonarQube`: tự cài đặt, tự quản lý tự quét -> được rát nhiều công ty ưa chuộng 
      - `Codacy`: Quét được nhiều ngôn ngữ, quét sâu, tự self hosts khá phức tạp 
      - `Checkmarx`: 
      - `Code Climate`: nhanh, sd dễ dàng, quét chưa sâu lắm
    - Vào [gartner.com](https://www.gartner.com/reviews/market/application-security-testing) để xem các phần so sánh các công cụ để mình có xem được các công cụ đó có áp dụng được hay không
### Sử dụng [codeclimate](https://github.com/codeclimate) 
- Quay lại `dev-server` chuyển sang user gitlab-runner chạy lệnh
    ```
    docker run \ 
        --interactive --tty --rm \
        --env CODECLIMATE_CODE="$PWD" \
        --volume "$PWD":/code \
        --volume /var/run/docker/sock:/var/run/docker.sock \
        --volume /tmp/cc:/tmp/cc \
        codeclimate/codeclimate analyze -f html > online-shop-backend.html
    ```
- Quét xong in file kết quả ra và xóa container đó thì sẽ tối ưu hơn 
- Vào trong 1 pipeline để xem đường dẫn thư mục làm việc hiện tại chứa source code 
    
    ![alt text](/Images/image-3.png)

- Tích hợp vào quy trình pipeline: tạo 1 nhánh từ `pipeline-be-3` là `pipeline-be-7` và thêm 1 stage sau đó lưu vào trong `gitlab artifacts`
    ```
    variables:
        ....
        CODECLIMATE_FILE: "${CI_PROJECT_NAME}_${CI_COMMIT_REF_NAME}_${CI_COMMIT_SHORT_SHA}_codeclimate"
    build:
        ....
    codeclimate:
        stage: test source code
        variables:
            GIT_STRATEGY: none
        script:
            - docker run --tty --rm --env CODECLIMATE_CODE="$PWD" --volume "$PWD":/code --volume /var/run/docker/sock:/var/run/docker.sock --volume /tmp/cc:/tmp/cc codeclimate/codeclimate analyze -f html > ${CODECLIMATE_FILE}
        tags: 
            - online-shop-runner-dev-shell
        only:
            - tags
        artifacts:
            paths:
            - ${CODECLIMATE_FILE} 
            expire_in: 1 day
    ```
    - Tạo Tag và kiểm tra file test 
    - Có thể chỉnh sửa nâng cao hơn ở file `.codeclimate.yml` như là cấu hình giới hạn quét ở thư mục nào rồi các chiến lược quét
### Sử dụng [Snyk](https://docs.snyk.io/)
- Vào docs để xem các cách triển khai 
    - Để sử dụng được công cụ này thì thiết bị phải cài đặt nodejs cũng như là `cài snyk trên npm`
    - Tiến hành login với dockerhub và `source code sẽ lưu trữ ở dockerhub`
    - Để tải về thì sử dụng câu lệnh `npm install snyk -g` và `npm install snyk-to-html -g` 
    - Sau đó ở trong thư mục dự án với user gitlab-runner và tiến hành đăng nhập sẽ phải lấy api token của user trên snyk 
    - Chạy `snyk auth <TOKEN>` và snyk test và snyk monitor truy cập vào địa chỉ và nó hiển thị kết quả quét được từ dự án 
    - Lưu trữ dưới dạng file để dễ dàng xem `snyk test --json | snyk-to-html -o online-shop-backend_v1.html`
- Triển khai trên pipeline
    - Quay lại pipeline-be-7 và thêm 
    ```
    variables:
        ...
            SNYKSCAN_REPORT: "${CI_PROJECT_NAME}_${CI_COMMIT_REF_NAME}_${CI_COMMIT_SHORT_SHA}_snykscan"
    snykscan:
        stage: test source code
        variables:
            GIT_STRATEGY: clone
        script:
            - snyk test --json | snyk-to-html -o $SNYKSCAN_REPORT.html || true
        tags:
            - online-shop-runner-dev-shell
        only:
            - tags
        artifacts:
            paths:
            - $SNYKSCAN_REPORT.html
            expire_in: 1 day
    ```
    - Chạy song song nên phải clone và test về 
- Triển khai bằng docker
    - Search [`snyk docker image`](https://hub.docker.com/r/snyk/snyk-cli)
    - Hoặc tạo file [`Dockerfile-snyk`](/Files-config/Backend/Gitlab/pipeline-be-7/Dockerfile-snyk) mới với report là html luôn 
    - Sửa lại `.gitlab-ci.yml`
    
    ```
    snykscan:
        stage: test source code
        variables:
            GIT_STRATEGY: clone
        script:
            - docker build -rm --network --build-arg SNYK_AUTH_TOKEN=$SNYK_TOKEN --build-arg OUTPUT_FILENAME=$SNYKSCAN_FILE -t $SNYKSCAN_FILE -f Dockerfile-snykscan .
            - docker create --name $SNYKSCAN_FILE $SNYKSCAN_FILE 
            - docker cp $SNYKSCAN_FILE:/app/$SNYKSCAN_FILE.html .
        tags:
            - online-shop-runner-dev-shell
        only:
            - tags
        artifacts:
            paths:
            - $SNYKSCAN_FILE.html
            expire_in: 1 day
    ```
    - Tạo tag và kiểm tra 
## Quy trình 7 SCA (Kiểm tra bảo mật phần hạ tầng)
- Quét docker image: có những lỗ hổng, và cụ kiểm tra 
- Search `docker images tools scan`: sử dụng [trivy](https://github.com/aquasecurity/trivy) 
- Có thể lọc theo mức độ cảnh báo để hiển thị như mức `HIGH` và mức `MEDIUM` trở lên 
- Vừa có thể quét được `docker images` mà còn có thể quét được `source code` và còn có thể quét được cả `bảo mật của k8s` dễ sử dụng và mạnh mẽ 
### Triển khai thủ công 
- Quét source code: 
    ```
    docker run aquasec/trivy fs . 
    ```
- Quét docker images:
    ```

    ```
- Tạo ra 1 nhánh mới `pipeline-be-8` từ `pipeline-be-7` thêm 1 bước để scan source code và sửa lại file [.gitlab-ci.yml](/Files-config/Backend/Gitlab/pipeline-be-8/.gitlab-ci.yml)
    ```
    trivyfs scan:
        stage: test source code
        variables:
            GIT_STRATEGY: clone
        script:
            - docker run --rm -v $PWD:/${CI_PROJECT_NAME} -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy fs /${CI_PROJECT_NAME} --severity HIGH,CRITICAL --format template --template "@contrib/html.tpl" --output /${CI_PROJECT_NAME}/$TRIVYFS_REPORT.html
        tags:
            - online-shop-runner-dev-shell
        only:
            - tags
        artifacts:
            paths:
            - $TRIVYFS_REPORT.html
            expire_in: 1 day
    ```
- Thêm 1 bước để scan image 
    ```
    trivy scan image:
        stage: security scan image
        variables:
            GIT_STRATEGY: none
        script:
            - docker run --rm -v $(pwd):/${CI_PROJECT_NAME} -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --reset
            - docker run --rm -v $(pwd):/${CI_PROJECT_NAME} -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --format template --template "@contrib/html.tpl" --output /${CI_PROJECT_NAME}/${TRIVY_IMAGE_REPORT}.html $IMAGE_VERSION
        tags:
            - online-shop-runner-dev-shell
        only:
            - tags
        artifacts:
            paths:
            - ${TRIVY_IMAGE_REPORT}.html
            expire_in: 1 day
    ```
## Quy trình 8 ()
- Đầu ra là gì: ứng dụng hoàn chỉnh tránh được các cái lỗi xss, SQL injection, ... 
- Kiểm tra bảo mật cho website đã được chạy hoàn chỉnh 
- Test website khi đang chạy trực tiếp
- Search `Best vulnerability Scanner oftware`
    - Wiz: công cụ chưa phù hợp hiện tại 
    - Tebnable Nessu: 0 recommand 
- Sử dụng công cụ [`Arachni`](https://github.com/Arachni/arachni)
    - Là framework RUBY được thiết kế để kiểm tra bảo mật ứng dụng web bằng cách cung cấp các tính năng đa dạng với hiệu suất cao, tự đào tạo và phân tích hành vi của ứng dụng web để đưa ra kết quả chính xac và hiệu quả, giúp kiểm tra được các lỗ hổng bảo mật 
    - Có thể custom rất hiệu quả ở ứng dụng này 
    - Xác thực và thử kiểm tra các lỗ hỗng phức tạp 
    - Có định dạng html 
    - Quét trực tiếp và in kết quả ra file html
### Cài đặt và sử dụng trực tiếp bằng giao diện
- Search `arachni docker images` hoàn toàn có thể chạy bằng docker
- Triển khai trên `build-server` 
    ```
    docker run --network host -d -p 222:22 -p 7331:7331 -p 9292:9292 --name arachni/arachni:latest
    ```
- Truy cập vào với địa chỉ và port là `9292` đăng nhập tk mật khẩu mặc định là `admin@admin.admin` và `administrator`
- Thêm user để thành viên có thể xem kết quả và kt bảo mật 
- `Dispatchers`: 1 phần cho phép quản lý và phân phối việc quét bảo mật đến với các máy chủ hoặc các node quét khác nhau, giúp chia nhỏ và phân phối công việc
- `Profile` : Có các cấu hình chứa các chức năng quét khác nhau, custom dựa trên default hạ các mức khác xuống
- Tạo 1 scan
    - Với `target name`: http://IP-server-build:3000
    - `Profile`: Default
    - Share with: ...
- Quét thành công với các report 
- Có thể download dưới dạng html và kiểm tra 
### Cài đặt và sử dụng trực tiếp bằng CLI
- Tạo 1 user mới `adduser arachni` vào thư mục home của user và download source code 
- `Arachni release` và [cách sử dụng bằng CLI](https://github.com/Arachni/arachni/wiki/Command-line-user-interface)
```
wget https://github.com/Arachni/arachni/releases/download/v1.6.0/arachni-1.6.0-0.6.0-linux-x86_64.tar.gz
```
- Giải nén và di chuyển vào thư mục và bắt đầu quét và chạy lệnh để chuyển đổi sang file định dạng html

    ```
    bin/arachni --output-verbose --scope-include-subdomains http://192.168.254.110:3000 --report-save-path=/tmp/online-shop-frontend.afr

    bin/arachni_reporter /tmp/online-shop-frontend.afr --reporter=html:outfile=/tmp/online-shop-frontend.html.zip
    ```
- Viết lại [Dockerfile-arachni](/Files-config/Backend/Gitlab/pipeline-be-9/Dockerfile-arachni) để thuận tiện cho việc tái sử dụng 
- Sử dụng lệnh để build và chạy 

    ```
    docker build --network host -t arachni:1.6.0-0.6.0 -f Dockerfile-arachni . 
    docker run --rm -v /tmp/:/tmp/ arachni:1.6.0-0.6.0 bin/arachni --output-verbose --scope-include-subdomains http://192.168.254.110:3000 --report-save-path=/tmp/online-shop-frontend.afr
    
    docker run --rm -v /tmp/:/tmp/ arachni:1.6.0-0.6.0 bin/arachni_reporter /tmp/online-shop-frontend.afr --reporter=html:outfile=/tmp/online-shop-frontend.html.zip
    ```
- Có thể push lên dockerhub để dễ dàng kiểm tra
### Chạy trên pipeline 
- Tạo 1 nhánh `pipeline-fe-9` từ `pipeline-fe-8` 
- Sau bước deploy thì sẽ tạo ra 1 bước `security scan website` và tạo biến report 
- Và thêm stage
    ```
    ARACHNI_WEBSITE_REPORT: 
    security scan website:
        stage: security scan website
        variables:
            GIT_STRATEGY: none
        script:
            - docker run --rm -v /tmp/:/tmp/ arachni:1.6.0-0.6.0 bin/arachni --output-verbose --scope-include-subdomains $ADD_FRONTEND --report-save-path=/tmp/$ARACHNI_WEBSITE_REPORT.afr > /dev/null 2>&1
            - docker run --rm -v /tmp/:/tmp/ arachni:1.6.0-0.6.0 bin/arachni_reporter /tmp/$ARACHNI_WEBSITE_REPORT.afr --reporter=html:outfile=/tmp/$ARACHNI_WEBSITE_REPORT.html.zip
            - sudo chmod 777 /tmp/$ARACHNI_WEBSITE_REPORT.html.zip
            - cp /tmp/$ARACHNI_WEBSITE_REPORT.html.zip .
        tags:
            - 
        only:
            - tags
        artifacts:
            paths:
            - $ARACHNI_WEBSITE_REPORT.html.zip
    ```
## Quy trình 9 (Kiểm tra hiệu năng)
- Tốc độ phản hồi của trang web ảnh hưởng rất nhiều đến hiệu quả, uy tín và trải nghiệm khách hàng 
- Có rất nhiều lý do từ bên phía vận hành hoặc dev
- Kiểm tra hiệu xuất để xem các kết quả trả ra như thế nào rồi xác định nguyên nhân do đâu để khắc phục và đảm bảo chi phí rồi phần nào chưa tốt và phần đó của bên nào để cho các bên liên quan có thể khắc phục nhanh chóng -> `Đó là phương pháp giả lập số lượng ccu (Concurrent Users)` số lượng người truy cập đồng thời 
    - VD: 1000 người truy cập vào website trong vòng 10s, giả lập trong khoảng 5 phút có hàng nghìn người truy cập website với 2 phút đầu lượng truy cập tăng đều và phút thứ 3 tăng đột biến và giảm dần ở phút thứ 4,5 
    - Test tải tối đa xem với bao nhieu người truy cập trong khoảng thời gian bao nhiêu thì website sẽ đạt ngưỡng
    - Sử dụng `k6` để test perfoment với câu lệnh đơn giản, cài đặt dễ dàng, viết bằng `javascript` để cấu hình 
- `K6` là công cụ mã nguồn mở để giúp thử nghiệm hiệu suất và khả năng chịu tải của website, tạo ra các kịch bản thử nghiệm mô phỏng lưu lượng người dùng và đo lường hiệu suất của ứng dụng web trong điều kiện tải lớn 
    - Để làm gì và có thể làm được gì 
    - Thử nghiệm hiệu suất và khả năng chịu tải của website, tạo ra các kịch bản thử nghiệm mô phỏng lưu lượng người dùng rồi chạy chúng 
    - Mục đích của từng loại testing:
    - `Load testing`: kiểm tra hiệu xuất của hệ thống khi gặp 1 lượng công việc tải lớn, mục đích đo lường và đánh giá các yếu tố như thời gian đáp ứng, thời gian tiêu tốn và sự ổn định của hệ thống dưới tải cao (Kiểm tra hiệu suất với tải bình thường)
    - `Smoke testing`: Mục tiêu là kiểm tra nhanh chóng các chức năng cơ bản của hệ thống để đảm bảo mọi thứ hoạt động đúng, thường th với tải rất nhỏ (Kiểm tra cơ bản với tải rất nhỏ)
        - VD: thiết lập người dùng ảo là 1 rồi kiểm tra kéo dài trong vòng 1 phút 
    - `Stress testing`: Mục tiêu là tìm điểm phá vỡ của hệ thống bằng cách tăng dần tải lên mức cao hơn bình thường (Tìm điểm phá vỡ của hệ thống với tải tăng dần)
        - VD: tăng dần và giảm dần sl người dùng qua các mức 100, 200 trong 1 khoảng tg cụ thệ, cũng như duy trì sl người dùng tới mức cao tải để kiểm tra
        - `spike testing`: Tăng giảm, duy trì đột ngột trong 1 khoảng tg ngắn
            - VD: tăng người dùng từ 1 lên 100 trong vòng 10s rồi duy trì số lượng đó trong 1p rồi giảm đột ngột từ 100 xuống 1 
    - `Soak Testing`: Kiểm tra tính ổn định và hiệu xuất của hệ thống trong 1 khoảng thời gian dài vởi tải bình thường hoặc cao (Kiểm tra tính ổn định và hiệu suất trong thời gian dài với tải bt hoặc cao)
        - VD: Viết kịch bản 3 giai đoạn, GD1 tăng dần số lượng người dùng từ 0-50 trong vòng 2p, tiếp theo là duy trì số lượng 50 người dùng đó trong vòng 4h để kiểm tra tính ổn định, lâu dài rồi cuối cùng là giảm dần số lượng người dùng từ 50-0 trong vòng 2p 
    - Các chỉ số sẽ được tinh chỉnh thêm dựa vào các yc của dự án hoặc hệ thống, qdinh cụ thể của từng cty
- Search `k6s result output html` 
- Các câu lệnh sẽ sử dụng
    - vus: số lượng người dùng ảo sẽ sd để test tải hệ thống, mỗi vus thực hiện các hành động thực sự với các kịch bản được tạo ra và gửi các yêu cầu http và chờ phản hồi 
    - duration: thời gian chạy 
    - iteration: Chỉ định số lần người dùng ảo thực hiện kịch bản kiểm thử bất kể thời gian bao nhiêu
- `Automation perfomance testing`: kiểm thử hiệu năng tự động hóa, là quá trình lặp đi lặp lại và nhất quán nhằm phát hiện các vấn đè về độ tin cậy ở các gd khác nhau trong các giai đoạn phát triển và phát hành phần mềm, tích hợp vào quy trình pipeline
### Cài đặt k6 và triển khai test
- search [`install k6`](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- Script [k6-install.sh](Tools-install/k6/k6-install.sh)
- Tạo 1 thư mục `mkdir -p /tools/test-k6/` để chứa các kịch bản 
    - Tạo file [load-test.js](/Files-config/k6/load-test.js) giả lập người dùng ảo là 100 và kiểm tra tác động vào website trong vòng 10s và đặt threshold là 95% các yêu cầu http phải hoàn thành trong vòng dưới 500ms
    - Chạy `k6 run load-test.js`
- Đọc các kết quả 
    - `data_received`: lượng dữ liệu máy chủ nhận được 
    - `data_sent`: lượng dữ liệu được gửi từ máy khách đến máy chủ 
    - `http_req_blocked`: thời gian yêu cầu http bị chặn (có thể do server hoặc đợi mạng), thời gian mà yêu cầu phải chờ đợi trước khi yêu cầu được gửi tới
    - `http_req_connecting`: thời gian mà máy khách mất để kết nối tới máy chủ sau khi đã gửi đến server, bao gồm thiết lập tcp tới máy chủ, nếu thời gian quá cao sẽ ảnh hướng tới vấn đề mạng
    - `http_req_duration`: thời gian chung của các yêu cầu http bao gồm cả các giai đoạn trước và sau khi đã gửi yêu cầu, thời gian để hoàn thành tổng cộng các yêu cầu http cả quá trình gửi và nhận 
    - `http_req_fail`: tỉ lệ request bị fail 
    - `http_req_receiving`: thời gian để nhận dữ liệu từ máy chủ, thể hiện cho thấy tốc độ máy chủ gửi dữ liệu về cho máy khách thời gian chờ quá lâu có thể thấy máy chủ đang có vấn đề hoặc mạng đang gián đoạn
    - `http_req_sending`: thời gian để gửi dữ liệu lên máy chủ và cho thấy tốc độ gửi dữ liệu từ máy khách lên đến server 
    - `http_tls_handshaking`: thời gian thiết lập kết nối an toàn
    - `http_req_waiting`: thời gian chờ phản hồi từ máy chủ sau khi gửi yêu cầu (client gửi yêu cầu từ máy chủ và chờ phản hồi về)  
    - `http_reqs`: số lượng request
    - `iteration_duration`: thời gian trung bình cho mỗi vòng lặp tính lúc bắt đầu đến khi hoàn thành
- Viết 1 kịch bản mới để trả về login thành công hay thất bại 
    - File [login-test.js](/Files-config/k6/login-test.js)
    - Chạy `k6 run -u 100 -d 20s login-test.js`
    - Tạo [login-test-v2.js](/Files-config/k6/login-test-v2.js)
    - Chạy `k6 run -u 100 -d 20s login-test-v2.js`
- Viết kịch bản với lượng user sẽ thay đổi bất thường 
    - File [spike-test.js](/Files-config/k6/spike-test.js)
    - Chạy `k6 run -u 100 -d 20s spike-test.js`
- Viết kịch bản smoke test nhanh và áp dụng vào pipeline
    - File [smoke-test.js](/Files-config/k6/smoke-test.js)
    - Chạy `k6 run -u 100 -d 20s smoke-test.js`
- Khi tích hợp swagger thì sẽ có 1 url `http://192.168.254.110/swagger/v1/swagger.json` có thể hoàn toàn test = endpoint ntn test = DAST hoặc pentest hoàn toàn có thể sử dụng endpoint đó 
- Thêm các tư duy, kịch bản test thì có thể có các cấu hình ở [Thư mục](/Files-config/k6/)
### Triển khai trên pipeline 
- Tạo ra 1 nhánh `pipeline-be-10` kế thừa từ `pipline-be-9`
    - Tạo ra 1 thư mục chứa các file kịch bản `performace_testing_script` và tạo file [smoke-test.js](/Files-config/k6/smoke-test.js) vào đó và commit `config(docs): add smoke test script` 
    - Có bước after_script: sau mỗi bước scan ra report tránh lỗi quyền 
    - `Docker run onwer user`
        ```
        after_script:
            - sudo chown -R gitlab-runnner $(pwd)
        ```
    - Sử dụng image `loadimpact/k6` làm image để kéo về và chạy k6
    - Viết 1 stage sau stage scan website với [.gitlab-ci.yml](/Files-config/Backend/Gitlab/pipeline-be-10/.gitlab-ci.yml) 
        ```
        performace testing:
            stage: performace testing
            variables:
                GIT_STRATEGY: none
            script:
                - chmod -R 777 ./performace_testing_script
                - docker run --rm -v $(pwd)/performace_testing_script:/performace_testing_script loadimpact/k6 run -e RESULTS_PATH=/performace_testing_script --summary-export=/performace_testing_script/summary_perf.json /performace_testing_script/smoke-test.js 
            after_script:
                - sudo chown -R gitlab-runner $(pwd)
            tags:
                - 
            only:
                - tags
            artifacts:
                paths:
                - $K6_PERFORMACE_TEST_REPORT.csv
        ```
- Hoàn toàn có thể export = html bằng cách sử file `smoke-test.js` và import html
    ```
    import { httpReport } form "http://raw..."

    export function handleSummary(data) {
        return {
            "/performace_testing_script/summary.html": htmlReport(data),
        };
    }
    ```
- Sửa pipeline
    ```
    script:
        - docker run --rm $(pwd)/performace_testing_script:/performace_testing_script loadimpact/k6 run /performace_testing_script/smoke-test.js
        - mv ./performace_testing_script/summary.html $(pwd)/$K6_PERFORMACE_TEST_REPORT.html
    ```
- Có những chỉ số quan trọng:
    - ttsp: thời gian từ khi gửi yêu cầu đến khi nhấn được byte đầu tiên từ server (thời gian càng ngắn thì hiệu suất sẽ càng tốt)
    - faild load type: thời gian tải hoàn toàn xong trang web bao gồm html, css, javascript, jss (thời gian càng ngắn thì hiệu suất sẽ càng tốt)
    - tts: thời gian người dùng chờ đợi trang web trở nên tương tác sau khi được tải xong (thời gian càng ngắn trải nghiệm người dùng càng tốt )
    - VD 1 trang web được coi là có hiệu suất tốt thường có các chỉ số 
        - ttsp: thấp hơn 200ms
        - Thời gian tải trang hoàn thành: dưới 3s
        - tti: dưới 5s 
        - Được coi là 1 website tốt
## Triển khai bằng Jenkins 
### Cài đặt và cấu hình 
- Tạo 1 con server mới
    - IP: `192.168.254.120` domain `jenkins.anphuc.tech`
    - Cài đặt jenkins : [jenkins-install.sh](/Tools-install/Jenkins/jenkins-install.sh)
    - Tải `nginx` và sử dụng revert proxy 
    - File [`/etc/nginx/conf.d/jenkins.anphuc.tech`](/Files-config/Jenkins/jenkins.anphuc.tech.conf)
    - cat giá trị trên màng hình để lấy được pasword và thiết lập cấu hình
    - Install tất cả plugin
- Thiết lập jenkins agent trên server build 
    - Vào `manage` -> `Nodes` -> `new nodes`
    - name `build-server`, number of executor `4` labels (IP của server) `192.168.254.110`
    - Save 
- Truy cập lại `server build ` và cấu hình theo cấu hình ở trên 
    - Tạo use `adduser jenkins` và thư mục làm việc `mkdir /var/lib/jenkins` và gán quyền `chown -R jenkins. /var/lib/jenkins`
    - add host jenkins domain 
    - chuyển qua user jenkins, di chuyển vào thư mục làm việc và chạy các câu lệnh ở trên phần thêm node 
    - Nếu lỗi 404 thì vào phần Security -> Agents -> fixed và chọn port bất kì chưa được sử dụng
    - Chạy lại cấu hình
- Viết bằng service để chạy nền 
    - vi [/etc/systemd/system/jenkins-agent.service](/Files-config/Jenkins/jenkins-agent.service)
    - systemctl daemon-reload 

## Triển khai dự án bằng Kubernetes
- Khi chỉ triển khai bằng dotnet hay docker run thì dự án đã chạy được tuy nhiên các cách triển khai đó thì sẽ cho thấy những yếu điểm trong bài toán lượng người dùng truy cập bất thường
    - Biết scale hệ thống, tăng tài nguyên hoặc tăng thêm server 
    - Tăng và hạ tài năng với container đơn giản và thuận tiện hơn nhiều so với chạy daemon 
    - Khi lượng người truy cập tăng đến cái ngưỡng mà ta thiết lập thì hệ thống sẽ tự động scale lên và khi lượng truy cập bị giảm đi thì các điều kiện về phần chịu tải không đáp ứng, giảm xuống hạ tầng dự án cũng giảm xuống một cách tự động
### Cài đặt và cấu hình 
- Cài đặt tự động bằng [`kubespray`](https://github.com/kubernetes-sigs/kubespray)
- Cài đặt với `3 server` và ram là `3GB `và CPU là `2` cấu hình server và add host 3 server này lại với nhau với tên `k8s-master-1/2/3` update packed và cài pythone để cài ansible 
- Tắt swapoff trước `swapoff -a` trên cả 3 server 
- Cài đặt tự động bằng Ansible từ server `master-1`
    - ``
    - `apt install ansible-core -y` 
    - Để ý phần requirements xem thử yêu cầu ansible từ phiên bản bao nhiêu để dễ cấu hình 
    - Cấu hình copy tự động bằng tay 
    ```
    ssh-keygen -t rsa 
    ssh-copy-id (IP đích cần ssh)
    ```
    - clone source code `git clone https://github.com/kubernetes-sigs/kubespray.git --branch release-2.24`
    - vào thư mục vừa được clone về và chạy lệnh `cp -rfp inventory/sample inventory/mycluster` tạo 1 file [`inventory/mycluster/hosts.ini`](/Files-config/Ansible/hosts.ini) 
    - Chạy lệnh để cài đặt và reset lại nếu bị lỗi
    ```
    ansible-playbook -i inventpry/mycluster/host.ini --become --become-user-root cluster.yml

    ansible-playbook -i inventpry/mycluster/host.ini --become --become-user-root reset.yml
    ```
    - Chạy `kubectl get node`, `kubectl get pod -A` -> thấy bị lỗi ở 2 pod kube-system 
    - kiểm tra log `kubectl logs ... -n kube-system` -> thấy lỗi loop và sửa `kubectl edit configmap coredns -n kube-system` -> sửa forward thành `. 8.8.8.8 8.8.4.4` -> `kubectl rollout restart deployment coredns -n kube-system`
### Lý thuyết
- Search `kubernetes flow` 
    - Luồng đi từ ngoài vào: `Traffic -> ingress -> service -> deployment -> pod`
    - Triển khai dự án
    - Triển khai hạ tầng
- `Pod`: đơn vị triển khai nhỏ nhất của k8s, nên chạy 1 container duy nhất (như 1 server ảo chứa các container)
- Workload: quản lý được pod Như `Deployment` hoặc `Job` và sử dụng replica, 
- `Deployment`: quản lý các pod, như việc tăng số lượng pod để tăng khả năng chịu tải, rollback các phiên bản trước đó của pod, kiểm tra trạng thái của pod và xóa tài nguyên
- replication: định nghĩa số lượng pod 
* `Từng dự án chạy với 1 container -> 1 container chạy 1 pod -> deployment sẽ quản lý, xác định sl pod chạy dự án với replica`
- `Service`: Là phương pháp để lộ trình mạng cho 1 ứng dụng đang chạy dưới dạng 1 hoặc nhiều pod trong cụm 
    - ClusterIP: Nếu đi đúng với luồng traffic ban đầu thì ta sẽ dùng cluster và mặc định nếu không cấu hình, sẽ đi qua ingress rồi xuống tới các pod tương ứng
    - NodePort: Đi qua ứng dụng mà không đi qua ingress, expores và chạy ứng dụng với dãy port (30000-32767) được gán tương ứng
    - Loadbalance: Tích hợp khi sử dụng cloud, khi mà k8s được tích hợp, triển khai trên AWS,...
    - ExternalName: Hoạt động khi gọi đến service thì DNS sẽ trả về tên miền DOMAIN được sử dụng khi chỉ định 1 tài nguyên bên ngoài internet 
- `Ingress`: Dùng để quản lý định tuyến lưu lượng mạng, tài nguyên quản lý lưu lượng mạng http, https từ bên ngoài vào đên các dịch vụ cụ thể bên trong cụm
  -    
