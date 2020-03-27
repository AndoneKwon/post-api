# post-api
Mongodb를 이용해 게시물을 생성. => 해결완료
추후 피드를 위한 탐색을 위해 날짜별로 Collection을 생성함. => 해결완료

2월29일
날짜별 Collection 방식은 옳지 않다는 판단을 하고 index를 이용해 날짜를 보조 인덱스로 삼아 탐색

# proxy방식
http-proxy-middlware를 이용해 proxy함.(front 부분에서)
yarn를 이용했기떄문에 yarn을 npm을 이용해 global로 설치를 하고

    yarn add http-proxy-middleware

명령어를 이용해 설치해줌.
그 후 setupProxy.js파일을 src폴더 안에 생성해주면 자동으로 인식해줌.
module.exports = function(app){
    app.use(proxy("/post",{target:"http://서버아이피:포트"}),
            proxy("/auth",{target:"http://서버아이피:포트"}));
};
와 같이 써주면 알아서 프록시 해준다.

# 오류해결
## 2/13~2/14
front에서 넘어온 token을 읽어서 그 값을 읽어오는 과정에서 에러 발생 => decode할시 secret과 해싱방식을 따로 명시해 놓지 않아서 발생한 에러.

실행후 서버에서 상태메세지가 --ms --로 뜨는 에러 => res.send와 같이 프론트에게 상태를 보내주지 않아 발생한 문제. 인터넷에 찾아보니 middleware 함수의 경우 next()를 써주지 않으면 발생하는 에러라고 함.

## 3/28
내 게시물 보기, 유저 게시물 보기 모두 무한스크롤로 변경
