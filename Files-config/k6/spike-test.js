import http from 'k6/http';
import { sleep,check } from 'k6';

export let options = {
    stages: [
        { duration: '1m', target: 50 },
        { duration: '10s', target: 500 },
        { duration: '3m', target: 50 },
        { duration: '2m', target: 0 },
    ]
};

// gửi yêu cầu đến http được chỉ định rồi sử dụng check để xem phản hồi 
export default function () {
    const res = http.get('http://192.168.254.110:3000/');
    check(res, {'status was 200': (r) => r.status === 200});
    sleep(1);
}
