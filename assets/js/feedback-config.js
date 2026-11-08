/* 反馈配置：
   1) endpoint 为空时，优先使用 Netlify Forms（本站由 Netlify 托管）；
   2) 部署了自建接口时，把 endpoint 填上即可改用 JSON 直传；
   3) email / github 作为发送失败时的备用渠道。 */
window.MP_FEEDBACK = {
  endpoint: '',
  netlify: true,
  netlifyForm: 'feedback',
  email: '13208789560@163.com',
  github: 'https://github.com/liyunlong136/liyunlong/issues/new'
};
