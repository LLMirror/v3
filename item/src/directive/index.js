import hasRole from './permission/hasRole'
import hasPermi from './permission/hasPermi'
import copyText from './common/copyText'
import number from './permission/number';
import money from './permission/money';
import english from './permission/english';
import throttle from './permission/throttle';
export default function directive(app){
  app.directive('hasRole', hasRole)
  app.directive('hasPermi', hasPermi)
  app.directive('copyText', copyText)
  app.directive('number', number)
  app.directive('money', money)
  app.directive('english', english)
  app.directive('throttle', throttle)
}