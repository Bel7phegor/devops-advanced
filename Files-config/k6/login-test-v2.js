import http from 'k6/http';
import { sleep } from 'k6';

// test api
export default function () {
    const url ="http://192.168.254.111:5214/api/User/login";

    const validPayload =JSON.stringify({
        email: "phucan2370@gmail.com",
        password: "Anphuc@1231",
    });

    const invalidpayload =JSON.stringify({
        email: "ok@gmail.com",
        password: "Anphuc@1231",
    });
    const headers = {
        'Content-Type': 'application/json',
    };

    function ramdomBoolean() {
        return Math.random() < 0.5;
    }

    const isSuccess = ramdomBoolean();

    let res;
    if (isSuccess) {
        res = http.post(url, validPayload, { headers });
    } else {
        res = http.post(url, invalidPayload, { headers });

    }
    sleep(1);
}

