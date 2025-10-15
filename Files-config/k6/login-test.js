import http from 'k6/http';
import { sleep } from 'k6';

// test api
export default function () {
    const url ="http://192.168.254.111:5214/api/User/login";

    const payload =JSON.stringify({
        email: "phucan2370@gmail.com",
        password: "Anphuc@1231",
    });
    const headers = {
        'Content-Type': 'application/json',
    };

    const res =http.post(url, payload, { headers });

    if (res.status === 200 || res.status === 201 ) {
        console.log('Đăng nhập thành công!');
    } else {
        console.error('Đăng nhập thất bại. Mã lỗi:',res.status);
    }
    sleep(1);
}

