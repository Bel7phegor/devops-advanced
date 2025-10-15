import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
    vus: 100,
    duration: '10s',
    thresholds: {
        http_req_duration: ['p(95)<500'],
    },
}

// gửi yêu cầu đến http được chỉ định rồi sử dụng check để xem phản hồi 
export default function () {
    let res = http.get('http://192.168.254.110:3000/');
    check(res, {'status was 200': (r) => r.status === 200});
    sleep(1);
}
