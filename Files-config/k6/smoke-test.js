import http from 'k6/http';
import { sleep,check } from 'k6';

export let options = {
    vus: 1,
    duration: '10s',
}

// gửi yêu cầu đến http được chỉ định rồi sử dụng check để xem phản hồi 
export default function () {
    const BASE_URL = 'http://192.168.254.110:3000/'
    let res = http.get(BASE_URL);
    check(res, {
        'homepage status is 200': (r) => r.status === 200});
    sleep(1);
}
